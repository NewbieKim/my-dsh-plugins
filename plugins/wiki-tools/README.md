# dsh-wiki-tools

树外 Web 插件：在右侧栏「开始」打开「知识图谱」页签，探测当前会话工作区的 wiki 根。v1 第一刀只交付页签、引导卡和空态/错误；图谱绘制是后续切片。

## 安装

要求：已安装 DeepSeek Harness（`dsh` 命令行）。先构建本包，再用 `link:` 挂到 web profile：

```sh
pnpm --filter dsh-wiki-tools build
dsh plugin --profile web add link:D:/path/to/deepseek-harness/plugins/wiki-tools
dsh web
```

源码联调（仓库根目录）：

```sh
pnpm --filter dsh-wiki-tools build
pnpm dsh web --patch plugins/wiki-tools/cordis.source.patch.yml
```

卸载：

```sh
dsh plugin --profile web remove dsh-wiki-tools
```

## 行为

- Cordis 行 id 为 `wiki-tools`，页签 `kind` 为 `wiki-graph`，只声明 Web 客户端平台。
- 右侧栏「开始」有「知识图谱」引导卡；点开进入图谱页签。没有工具箱首页，没有会话顶栏按钮。
- 打开页签时宿主 `GET /api/wiki-graph/graph?sessionId=` 探测 wiki 根（默认相对工作区的 `wiki/`）：无工作区、根不存在、根下没有 Markdown 时给出明确空态，不是空白画布。
- 配置字段 `root` 默认 `wiki`，必须落在工作区内。扫描跳过 `.obsidian/`、`node_modules/`、`.git/`。只读，不写盘。
- 不依赖浏览插件，不上 Typert Remote。

## 包结构

```text
src/index.ts                 # 宿主：GET 探测
src/probe.ts                 # wiki 根存在性检查
src/client/index.ts          # Web 端 apply：页签、引导卡、空态
src/client/WikiGraphBody.tsx
cordis.patch.yml             # 正式安装 → lib/
cordis.source.patch.yml      # 本地 --patch
```
