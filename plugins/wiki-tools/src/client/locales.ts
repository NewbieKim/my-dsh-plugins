/** `wiki-tools` namespace dictionaries. */

/** Namespace owned by the wiki-tools plugin. */
export const NS = 'wiki-tools'

/** Simplified Chinese labels and dictionary keys. */
export const zh = {
  'tab.title': '知识图谱',
  'guide.title': '知识图谱',
  'guide.description': '查看当前工作区 wiki 页面之间的链接',
  noWorkspace: '这个会话没有工作区目录',
  rootMissing: '找不到 wiki 根目录',
  noPages: 'wiki 根下没有 Markdown 页面',
} as const

/** Dictionary keys accepted by this plugin's translator. */
export type WikiToolsKey = keyof typeof zh

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Knowledge-graph tab, guide card, and empty-state copy. */
    'wiki-tools': WikiToolsKey
  }
}

/** English labels, checked against the Chinese key set. */
export const en: Record<WikiToolsKey, string> = {
  'tab.title': 'Knowledge graph',
  'guide.title': 'Knowledge graph',
  'guide.description': 'See how wiki pages in this workspace link to each other',
  noWorkspace: 'This session has no workspace directory',
  rootMissing: 'The wiki root directory was not found',
  noPages: 'The wiki root has no Markdown pages',
}
