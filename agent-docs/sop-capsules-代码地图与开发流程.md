# sop-capsules 代码地图与插件开发流程

本文只讲 `plugins/sop-capsules`（包名 `@nangeagi/dsh-sop-capsules`）。Harness 本体的启动链和目录职责在 [代码地图.md](代码地图.md)。

这是一个树外 Web 插件：宿主跑在 Node 里读写工作区文件，浏览器里画按钮和面板。两边不互相 import 业务代码，中间用 Typert Remote 命名空间 `sopCapsules` 通信。

当前这份源码已经接进本仓库。Web profile 的依赖是 `link:` 到 `plugins/sop-capsules`，所以 `pnpm dsh web` 加载的就是这里的 `lib/`，不是 npm 上的那一份。

---

## 1. 一次点击怎么走到磁盘

用户在会话顶栏点「提示胶囊」，面板在输入框上方打开。选用一条胶囊，正文写入当前输入框草稿，不会自动发送。

```text
会话顶栏按钮                         src/client/SopCapsulesHeaderAction.tsx
        |  openPanel()
        v
面板                                 src/client/SopCapsulesPanel.tsx
        |  只调用 props 里的回调，自己不发请求
        v
每个会话一份状态机                   src/client/surface.ts
        |  ctx.remote.sopCapsules.*
        v
浏览器远程桩（构建生成，不要手改）   lib/typert.remote-client.js
        |
        v
宿主服务                             src/index.ts   SopCapsulesService
        |  resolveLibraryRoot()
        v
定位库目录                           src/workspace-root.ts
        |
        v
读写文件                             src/library-io.ts
        |  单个分组的 yaml
        v
编解码                               src/group-yaml.ts
        |
        v
<工作区根>/.dsh/sop-capsules/
```

按钮挂在插槽 `conversation.session.header.utilities`，id 是 `sop-capsules`，order 是 `-20`（排在「用应用打开」左边）。面板挂在插槽 `conversation.input.overlay`，id 是 `sop-capsules-panel`。注册代码都在 `src/client/index.ts`。

空白首页「探索未至之境」会把整条会话顶栏藏掉，所以这时看不到按钮。先选工作区，再发出一条消息，顶栏出现之后按钮才在。没绑工作区时按钮在，但是禁用，提示「请先选择工作区」。

---

## 2. 目录地图

只列要读、要改的文件。`lib/` 是构建结果，`node_modules/` 不要读。

```text
plugins/sop-capsules/
├── package.json                 包名、导出、dsh.bundle / dsh.client
├── cordis.patch.yml             装进 profile 时插入插件行
├── cordis.source.patch.yml      内容相同，给 --patch 联调用
├── tsconfig.host.json           宿主类型检查，引用 Harness 的 Node 包
├── tsconfig.client.json         浏览器类型检查，引用 Harness 的 client 包
├── tsdown.config.ts             打出 lib/index.js 和 lib/client.js，并生成 Typert
├── src/
│   ├── index.ts                 宿主入口：SopCapsulesService + @Remote 方法
│   ├── types.ts                 胶囊、分组、清单的类型和错误码
│   ├── workspace-root.ts        从 sessionId 找到库目录
│   ├── library-io.ts            manifest 和分组文件的增删改查
│   ├── group-yaml.ts            单个分组 yaml 的解析和序列化
│   ├── css-modules.d.ts         CSS Modules 的类型声明
│   └── client/
│       ├── index.ts             浏览器入口：挂远程、注册文案和两个插槽
│       ├── slots.ts             按钮和面板的 props 类型
│       ├── surface.ts           每个会话的状态和全部业务动作
│       ├── locales.ts           中英文案，键以 zh 为准
│       ├── slash-refs.ts        注入后给输入框里的 /词 加上引用样式
│       ├── SopCapsulesHeaderAction.tsx
│       ├── SopCapsulesHeaderAction.module.css
│       ├── SopCapsulesPanel.tsx
│       └── SopCapsulesPanel.module.css
└── tests/                       和上面的行为一一对应，见第 7 节
```

`package.json` 里和加载有关的两段：

| 字段 | 作用 |
| --- | --- |
| `main` → `lib/index.js` | 宿主入口。Loader 按这个文件把插件挂进 Node |
| `exports["./client"]` → `lib/client.js` | 浏览器入口。Web 启动清单按这个文件下发到页面 |
| `exports["./remote"]` | 生成的浏览器远程桩。`src/client/index.ts` 用它 `$mount` |
| `dsh.bundle.patch` | 指向 `cordis.patch.yml`，profile 把它列进 `bundles` 后就会插入插件 |
| `dsh.client.platform: web` | 声明这是 Web 客户端插件 |
| `dsh.client.inject` | 只说明激活顺序上的包名依赖，不决定函数调用关系 |

---

## 3. 宿主半边

宿主只做一件事：按会话找到工作区，再读写那份库。它不渲染界面。

### `src/index.ts`

`SopCapsulesService` 继承 `TypertRemoteService`，构造时命名空间固定为 `sopCapsules`。它注入三个宿主服务：`sessions`、`workspaceRegistry`、`sessionPersistence`。

带 `@Remote` 的方法会在 `pnpm --filter @nangeagi/dsh-sop-capsules build` 时被扫进 `lib/typert.host.js` 和 `lib/typert.remote-client.js`。浏览器之后才能调用同名方法。五个方法都是同一模式：先 `signal.throwIfAborted()`，再 `resolveLibraryRoot`，再交给 `library-io`。

| 方法 | 做什么 |
| --- | --- |
| `listLibrary` | 列出分组摘要，并把磁盘上未登记的 yaml 补进清单末尾 |
| `getGroup` | 读一个分组的全量胶囊 |
| `saveGroup` | 整份分组覆盖写入；新 id 追加到清单 |
| `deleteGroup` | 从清单去掉并删除文件 |
| `reorderGroups` | 用一份完整 id 列表替换清单顺序 |

默认导出是这个类。Cordis 按默认导出把它当成服务插件。

### `src/workspace-root.ts`

`resolveLibraryRoot(ctx, sessionId)` 的通过条件同时满足才返回路径：

1. 宿主上有 `workspaceRegistry`。
2. 会话头能读到 `cwd`（先看内存里的会话，没有再问 `sessionPersistence`）。
3. 这个 `cwd` 规范化之后，等于某个工作区的 `path`，并且该工作区的 `sessionIds` 包含这个会话。

成功时返回 `<工作区 path>/.dsh/sop-capsules`。任一条件不满足就抛 `RemoteError`，code 是 `sop-capsules/no-workspace`。浏览器把这个 code 显示成「请先选择工作区」，不当成加载失败。

### `src/library-io.ts`

库根目录下只有两样东西：

```text
.dsh/sop-capsules/manifest.yaml
.dsh/sop-capsules/groups/<分组 id>.yaml
```

`manifest.yaml` 的字段是 `schemaVersion`（现在恒为 `1`）和 `groups`（有序的分组 id）。分组 id 不写进 yaml 正文，文件名去掉 `.yaml` 就是 id。

`listLibrary` 会扫描 `groups/`。文件在磁盘上、但不在 `groups` 数组里的，叫做孤儿，按文件名排序后追加到清单末尾，并在返回值的 `adoptedOrphanIds` 里带回。面板用它显示一条「已自动纳入」的提示。

写入走「先写 `*.tmp`，再 `rename`」。`reorderGroups` 要求传入的 id 和现有清单一一对应，否则抛 `gateway/bad-request`。找不到分组抛 `sop-capsules/group-not-found`。

### `src/group-yaml.ts` 和 `src/types.ts`

分组文件正文只有 `displayName` 和 `capsules`。每条胶囊三个字段：`id`、`title`、`body`。`parseGroupYaml` 把文件名里的 id 填回 `SopCapsuleGroup.id`。

`src/types.ts` 是宿主和浏览器共用的类型。错误码也声明在这里，通过扩充 `RemoteErrorDetailsMap`：

| code | 何时 |
| --- | --- |
| `sop-capsules/no-workspace` | 会话没有可用的工作区 |
| `sop-capsules/group-not-found` | 清单或文件里没有这个分组 |

`SOP_CAPSULES_SCHEMA_VERSION` 现在是 `1`。给已有工作区加字段时，读盘必须还能接受没有新字段的旧 yaml。

---

## 4. 浏览器半边

界面组件不碰网络，也不碰文件。数据进组件只有三条路：插槽自带的 `useWorkspaces` / `useSessions`、`hooks.sopCapsules` 这份会话状态、以及 `slots.ts` 里声明的回调。

### `src/client/index.ts`

`apply` 做两步：

1. `ctx.remote.$mount(sopCapsulesRemote)`，把生成的远程贡献挂上。挂上之后才有 `remote.sopCapsules`。
2. 再 `ctx.inject` 一个 UI 纤维，依赖 `slots`、`locale`、`remote.sopCapsules`、`remote.commands`、`remote.skills`、`sessions`、`conversation`。

`remote.commands` 和 `remote.skills` 只给斜杠引用样式用，用来收集「哪些 `/词` 该高亮」。文件顶部那个 `inject` 数组故意不包含 `remote.sopCapsules`，因为那时候远程还没挂上。

`registerUi` 做三件事：登记 `sop-capsules` 文案、用一个 `Map` 记住每个会话的 `SopCapsulesSurface`、把按钮和面板注册进两个插槽。插件卸下时清掉这些 surface。

### `src/client/surface.ts`

一个会话一个 `SopCapsulesSurface`。`surfaceFor` 没有就创建，创建时把 `ctx.remote.sopCapsules` 的五个方法绑进去。

状态在 `SopCapsulesSessionView`，用 `createSnapshotStore` 保存。组件通过 `useSopCapsules(state => ...)` 订阅。主要字段：

| 字段 | 含义 |
| --- | --- |
| `libraryStatus` | `idle` / `loading` / `ready` / `no-workspace` |
| `panelOpen` | 面板是否打开 |
| `panelMode` | `pick` 选用，或 `manage` 管理 |
| `groups` / `selectedGroupId` | 分组列表和当前选中 |
| `groupStatus` / `capsules` | 当前分组的加载状态和胶囊 |
| `searchQuery` | 按标题过滤，选用和管理共用 |
| `injectMode` | `replace` 或 `append`，按工作区记在 localStorage |
| `editor` | 新建/重命名分组，或新建/编辑胶囊 |
| `confirm` | 删除分组、删除胶囊、导入确认 |
| `mutationStatus` / `mutationError` | 保存中，以及失败后留在表单上的错误 |
| `orphanBanner` | 本次 `listLibrary` 收养了孤儿分组 |

`injectCapsule` 不发远程请求。`replace` 用胶囊正文换掉草稿；`append` 在已有文字后面空一行再接上。写入前会先跑 `prepare`，用来刷新斜杠高亮词表；词表失败也照样写入正文。

分组 id 用 `newStableId('g')`，胶囊 id 用 `newStableId('c')`。界面没有「改 id」这一项。拖拽排序用 `moveIdBefore`。

### `src/client/slots.ts`

这里没有运行逻辑，只有类型。`SopCapsulesHeaderInjected` 只有 `ensureLibrary` 和 `openPanel`。面板的全部动作都在 `SopCapsulesPanelInjected`。组件的 props 是三块拼起来的：插槽运行时数据、文案函数 `t`、这份注入。

要给面板加一个按钮，先在这个接口加回调，再在 `index.ts` 的 `inject` 里接到 surface 的方法，最后在 `SopCapsulesPanel.tsx` 里调用。

### `src/client/SopCapsulesHeaderAction.tsx`

读 `useWorkspaces` 判断这个会话有没有工作区，读 `libraryStatus` 判断库是否可读。有工作区就 `ensureLibrary()`。不能用时按钮 `disabled`，外面包一层可聚焦的 `span`，这样禁用状态下提示仍能出现。图标来自 `@deepseek-ai/dsh-client-ui-primitives` 的 `IconListPenOutlineRegular`。

### `src/client/SopCapsulesPanel.tsx`

面板浮在输入框上方，高度不超过输入框顶到页面顶的剩余空间（`panelCeiling`）。内部按 `panelMode` 分两套：

| 区域 | 函数 | 用户看到的 |
| --- | --- | --- |
| 选用 | `SopCapsulesPanel` 主体 | 分组、标题搜索、替换/追加、点一条就写入草稿 |
| 管理 | 同一组件的 manage 分支 | 分组和胶囊的新建、重命名、编辑、删除、拖拽 |
| 分组名弹层 | `GroupNamePopover` | 新建或重命名分组 |
| 胶囊表单 | `CapsuleEditorForm` | 标题和正文 |
| 确认 | `ConfirmPopover` | 删除或导入前的确认 |
| 导入导出 | `prepareImport` / `exportSelectedGroup` / `downloadTextFile` | 读一个 yaml，或下载当前分组 |

组件里的 `useEffect` 只做打开时补拉库、滚动条显隐、高度测量。业务判断放在 surface。

### `src/client/locales.ts` 和样式

文案键以 `zh` 为准，`en` 必须有同一套键。组件里写 `t('header.aria')`，不要写死中文。命名空间是 `sop-capsules`。

样式只放在两个 `*.module.css`。颜色用页面已有的 `--dsw-*` 变量。`tsdown.config.ts` 把 CSS Modules 打进 `lib/client.js`，运行时往 `document.head` 插一个 `<style>`。

### `src/client/slash-refs.ts`

注入成功后，输入框里和「当前会话指令名、内置指令声明词、技能名」完全一致的 `/词` 显示成引用样式，其余斜杠文本保持普通文字。词表来自 `remote.commands` 和 `remote.skills`。这层不决定胶囊正文写进去没有。

---

## 5. 构建产物

改 `src/` 之后页面不会自己变。运行的是 `lib/`。

| 命令 | 产出 |
| --- | --- |
| `pnpm --filter @nangeagi/dsh-sop-capsules build` | 先 `tsc -b` 出 `lib/types/`，再 tsdown 出 `lib/index.js`、`lib/client.js`，并生成 Typert |
| `pnpm --filter @nangeagi/dsh-sop-capsules bundle` | 只跑 tsdown。类型没变、只改了浏览器源码时用这个 |

不要手改：

- `lib/typert.host.js`
- `lib/typert.remote-client.js`
- `lib/typert.remote-client.d.ts`
- `lib/index.js`、`lib/client.js`

`tsdown.config.ts` 从 `../../packages/typert/generator/lib/types/tsdown-plugin.js` 引入生成器，所以这个目录必须放在仓库的 `plugins/sop-capsules`（往上两级是仓库根）。生成器文件不在时，先在仓库根执行 `pnpm run build:lib:host`。

宿主改动（`src/index.ts`、`library-io.ts`、`workspace-root.ts`、`group-yaml.ts`、`types.ts`）需要重新 build，然后重启 `pnpm dsh web`。只改 `src/client/` 或 css 时重新 `bundle`，再刷新浏览器。

`pnpm run dev:web` 只监视 `packages/*/*` 里的官方客户端，不会编译这个插件。

---

## 6. 测试对照

测试在 `plugins/sop-capsules/tests/`。改哪层行为，就看哪份测试。

| 文件 | 锁住的行为 |
| --- | --- |
| `skeleton.spec.ts` | `package.json` 的 `dsh.bundle` / `dsh.client`，以及两个 patch 都插入 id `sop-capsules` |
| `host-sop-capsules.spec.ts` | 宿主读写、孤儿分组、找不到分组、没有工作区 |
| `remote-client.spec.ts` | 生成的远程桩方法名还在 |
| `browser-plugin.client.spec.ts` | 浏览器 `apply` 把按钮和面板注册进两个插槽 |
| `header-action.client.spec.tsx` | 顶栏按钮的禁用、加载、打开面板 |
| `pick-panel.client.spec.tsx` | 选用：搜索、替换、追加 |
| `manage-panel.client.spec.tsx` | 管理：编辑、删除、导入导出、拖拽 |
| `surface-inject.client.spec.ts` | `injectCapsule` 的替换和追加 |
| `surface-manage.client.spec.ts` | surface 上的保存、删除、排序 |
| `slash-refs.client.spec.ts` | `/词` 何时变成引用样式 |
| `slash-refs-split.client.spec.ts` | 斜杠文本怎么切开 |
| `panel-material.spec.ts` | 面板样式用的是设计变量 |

---

## 7. 新手每天怎么改

改动都发生在 `plugins/sop-capsules/src`。不要改 `~/.dsh/profiles/web/node_modules`，那里只是指回这个目录的链接。

1. 先决定数据要不要落盘。只改面板上的开关、提示、布局，停在 `src/client/`。要让重启之后还在，就必须进宿主和 yaml。
2. 改完按第 5 节构建。宿主改动后停掉正在跑的 `pnpm dsh web`，再在仓库根执行一次。
3. 浏览器打开后：选一个工作区，发一条消息，看会话顶栏的列表笔图标。侧边栏「插件」滚到「已安装插件」能看到这个包，那只说明它被加载了，界面不在那一页。
4. 数据在你选中的那个文件夹的 `.dsh/sop-capsules/`。改坏格式时直接看 `manifest.yaml` 和 `groups/*.yaml`。

按想改的现象找文件：

| 现象 | 先打开 |
| --- | --- |
| 按钮不出现、禁用、提示不对 | `SopCapsulesHeaderAction.tsx`，然后确认会话已经离开空白首页 |
| 面板布局、按钮、表单 | `SopCapsulesPanel.tsx` 和它的 css |
| 点了没反应、列表不刷新、保存失败还留着表单 | `surface.ts` |
| 类型对不上，回调少一个参数 | `slots.ts`，再对 `client/index.ts` 的 `inject` |
| 中文或英文句子 | `locales.ts` 的 `zh` 和 `en` 一起改 |
| 写入草稿的规则、`/词` 高亮 | `surface.ts` 的 `injectCapsule`，以及 `slash-refs.ts` |
| 文件内容、排序、删了又出现 | `library-io.ts`、`group-yaml.ts` |
| 明明选了工作区仍提示没有工作区 | `workspace-root.ts` |
| 浏览器调用一个新方法报不存在 | `src/index.ts` 加 `@Remote`，然后完整 `build`，不要手改 `lib/typert.*` |

---

## 8. 加一个已有字段的界面

例：胶囊多一个「标签」字段，保存后还在。按这个顺序，不要从面板开始写。

1. `src/types.ts` 的 `SopCapsule` 加上 `tag`。旧文件可能没有这个字段，`group-yaml.ts` 的 `parseGroupYaml` 要给出缺省值，不能直接把旧库读崩。
2. `stringifyGroupYaml` 把 `tag` 写回去。
3. 不需要新的远程方法。整份分组仍然走 `saveGroup`。
4. `surface.ts` 的编辑器状态带上 `tag`。`beginEditCapsule` / `setEditor*` / `commitEditor` 读写它，`commitEditor` 放进交给 `saveGroup` 的胶囊对象。
5. `slots.ts` 增加对应回调。`client/index.ts` 把回调接到 surface。
6. `SopCapsulesPanel.tsx` 的 `CapsuleEditorForm` 加输入框。句子写进 `locales.ts` 的中英两份。样式写进 `SopCapsulesPanel.module.css`。
7. 补 `tests/manage-panel.client.spec.tsx` 或 `tests/surface-manage.client.spec.ts`，以及宿主侧 `tests/host-sop-capsules.spec.ts` 里读旧 yaml 的情况。
8. `pnpm --filter @nangeagi/dsh-sop-capsules build`，重启 `pnpm dsh web`。

---

## 9. 加一个新的远程方法

例：单独复制一条胶囊。界面回调仍然不能直接 `fetch`。

1. 在 `SopCapsulesService` 上新增方法，加上 `@Remote`。签名里带 `sessionId` 和 `signal: AbortSignal`，和现有方法一样。真正写文件放在 `library-io.ts`。
2. 新的失败原因加到 `src/types.ts` 的 `RemoteErrorDetailsMap`，抛 `RemoteError`。
3. 完整执行 `build`。生成器会更新 `lib/typert.remote-client.d.ts`。之后 `ctx.remote.sopCapsules` 上才有这个方法。
4. `surfaceFor` 里把新方法放进构造参数。`surface.ts` 写一个动作方法，成功和失败都 `state.update`。
5. `slots.ts` 和 `client/index.ts` 把动作交到面板。面板只调用这个回调。
6. 看 `tests/remote-client.spec.ts` 是否要断言新方法名，并给宿主补一条读写测试。

---

## 10. 和 Harness 本体的边界

这个插件不改 `packages/`。新按钮、新面板继续在 `src/client/index.ts` 里 `ctx.slots.inject` 到已经存在的插槽。插槽名可以在 `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts` 里查。

组件可以引用 `@deepseek-ai/dsh-client-ui-primitives` 里的按钮、图标、提示。不要 import 另一个功能插件的组件。

会话日志不记录「打开了面板」或「选了哪条胶囊」。写进输入框的正文，要等用户发送，才会成为会话事件。库文件在工作区目录里，不在 `~/.dsh/sessions`。
