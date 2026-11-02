/**
 * Browser half: register `wiki-graph` as a right-Sidebar page type with a guide card.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { WIKI_GRAPH_ID, wikiGraphDefinition } from './definition.ts'
import { loadWikiGraphStatus } from './load-status.ts' // 加载知识图谱状态
import { WikiGraphBody } from './WikiGraphBody.tsx'
import type { WikiGraphInjected } from './WikiGraphBody.tsx'
import { en, NS, zh } from './locales.ts'

/** Services required to register the localized knowledge-graph page. */
export const inject = ['slots', 'locale', 'sidebarRightTabs'] as const // 浏览器这边需要的服务

/**
 * Register dictionaries, the page type, and its tab body for this plugin's lifetime.
 * @param ctx - client root carrying the tab registry and slots.
 */
export function apply(ctx: ClientContext): void {
  const t = ctx.locale.bind(NS) // 绑定命名空间
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'wiki-tools: dictionaries') // 注册字典
  ctx.effect(() => ctx.sidebarRightTabs.register(wikiGraphDefinition(t)), 'wiki-tools: wiki-graph type') // 注册知识图谱类型
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register( // 注册知识图谱页签
    {
      name: 'sidebar.right.pane.tab',
      key: WIKI_GRAPH_ID,
      locale: NS,
      inject: (_sessionId): WikiGraphInjected => ({
        loadStatus: loadWikiGraphStatus,
      }),
    },
    WikiGraphBody,
  )), 'wiki-tools: wiki-graph tab body')
}
