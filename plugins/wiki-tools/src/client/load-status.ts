/** Browser loader for the wiki-graph probe GET. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { WikiGraphStatus, WikiGraphStatusKind } from '../types.ts'
import { WIKI_GRAPH_ROUTE } from '../routes.ts'

const STATUS_KINDS = new Set<WikiGraphStatusKind>(['no-workspace', 'root-missing', 'no-pages', 'ok'])

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/**
 * Load wiki-root presence for a Session from the Host probe route.
 * @param sessionId - Session whose workspace selects the wiki root.
 * @param signal - caller cancellation.
 * @param fetcher - HTTP carrier; defaults to `fetch`.
 * @returns a classified status the tab body can present.
 */
// 是浏览器这边的请求函数。它带上 sessionId 去 GET 那个接口，并检查返回的 kind 是不是四种状态之一。不是 200，或者 JSON 形状不对，就抛错。
export async function loadWikiGraphStatus(
  sessionId: SessionId,
  signal: AbortSignal,
  fetcher: FetchLike = fetch,
): Promise<WikiGraphStatus> {
  const query = new URLSearchParams({ sessionId })
  const response = await fetcher(`${WIKI_GRAPH_ROUTE}?${query.toString()}`, { method: 'GET', signal })
  if (!response.ok) {
    throw new Error(`wiki-graph probe failed: HTTP ${response.status}`)
  }
  const body: unknown = await response.json()
  if (typeof body !== 'object' || body === null || !('kind' in body)) {
    throw new Error('wiki-graph probe returned an invalid status')
  }
  const kind = (body as { kind: unknown }).kind
  if (typeof kind !== 'string' || !STATUS_KINDS.has(kind as WikiGraphStatusKind)) {
    throw new Error('wiki-graph probe returned an invalid status')
  }
  return { kind: kind as WikiGraphStatusKind }
}
