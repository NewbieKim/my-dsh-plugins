/**
 * Stage one of this package's registration: what the `wiki-graph` tab type is.
 *
 * The type is a page, not a viewer: it claims no address. The guide page offers
 * it as an entry box; picking the card opens this kind.
 */
import type { SidebarRightTabDefinition } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type {} from './locales.ts'

/** The tab kind this package owns. */
export const WIKI_GRAPH_KIND = 'wiki-graph'

/** This implementation's identity in the tab system, and the key its body registers under. */
export const WIKI_GRAPH_ID = 'dsh-wiki-tools'

/**
 * The knowledge-graph type's registry definition.
 * @param t - namespace-bound translate, read fresh on every label call.
 * @returns the definition to register.
 */
// 描述这张页签是什么。它不是「打开某个文件就出现」的查看器，没有地址匹配。右侧栏「开始」里有一张引导卡，标题是「知识图谱」，说明是「查看当前工作区 wiki 页面之间的链接」。点卡片才打开这个页签。
export function wikiGraphDefinition(t: TranslateNS<'wiki-tools'>): SidebarRightTabDefinition {
  return {
    id: WIKI_GRAPH_ID,
    kind: WIKI_GRAPH_KIND,
    title: () => t('tab.title'),
    guide: [{
      id: 'open',
      order: 40,
      title: () => t('guide.title'),
      description: () => t('guide.description'),
    }],
  }
}
