// @vitest-environment jsdom
/** Knowledge-graph tab body: named empty and error states, never a blank canvas. */

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { WikiGraphBody } from '../src/client/WikiGraphBody.tsx'
import type { WikiGraphBodyProps } from '../src/client/WikiGraphBody.tsx'
import { zh } from '../src/client/locales.ts'
import type { WikiGraphStatus } from '../src/types.ts'

afterEach(() => { cleanup() })

function mountBody(status: WikiGraphStatus) {
  const props = {
    sessionId: 'session-wiki' as SessionId,
    useTabInfo: () => ({ tab: { signal: new AbortController().signal } }),
    loadStatus: async () => status,
    t: makeTranslate(zh),
  }
  return render(<WikiGraphBody {...props as unknown as WikiGraphBodyProps} />)
}

describe('WikiGraphBody empty states', () => {
  it('names no-workspace, a missing wiki root, and a wiki with no Markdown, instead of a blank canvas', async () => {
    const cases = [
      ['no-workspace', zh.noWorkspace],
      ['root-missing', zh.rootMissing],
      ['no-pages', zh.noPages],
    ] as const
    for (const [kind, copy] of cases) {
      const view = mountBody({ kind })
      await act(async () => {})
      const node = view.container.querySelector(`[data-wiki-graph-state="${kind}"]`)
      expect(node, kind).not.toBeNull()
      expect(node?.textContent, kind).toBe(copy)
      cleanup()
    }
  })
})
