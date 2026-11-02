import { describe, expect, it, vi } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import { loadWikiGraphStatus } from '../src/client/load-status.ts'
import { WIKI_GRAPH_ROUTE } from '../src/routes.ts'

describe('wiki-graph client loader', () => {
  it('reads the probe JSON from the document-relative GET', async () => {
    const fetcher = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      expect(String(input)).toBe(`${WIKI_GRAPH_ROUTE}?sessionId=session-wiki`)
      expect(init?.method).toBe('GET')
      return Response.json({ kind: 'no-pages' })
    })
    await expect(loadWikiGraphStatus(SessionId('session-wiki'), new AbortController().signal, fetcher))
      .resolves.toEqual({ kind: 'no-pages' })
  })
})
