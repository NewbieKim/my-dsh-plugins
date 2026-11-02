/**
 * Host registration path and the document-relative form the browser addresses.
 */

/** Absolute registration path for the wiki-graph probe route. */
export const WIKI_GRAPH_PATH = '/api/wiki-graph/graph' // 知识图谱探针路由的绝对注册路径

/** Browser-relative form of {@link WIKI_GRAPH_PATH}. */
export const WIKI_GRAPH_ROUTE = WIKI_GRAPH_PATH.slice(1) // 浏览器相对形式的 {@link WIKI_GRAPH_PATH}
