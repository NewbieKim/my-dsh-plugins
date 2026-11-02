/** Knowledge-graph tab body: named empty and error states until the graph slice draws. */

import { useEffect, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { WikiGraphStatus, WikiGraphStatusKind } from '../types.ts'
import type { WikiToolsKey } from './locales.ts'
import css from './WikiGraphBody.module.css'

/** Face the tab body uses to load wiki-root presence. */
export interface WikiGraphInjected {
  /**
   * Load the current wiki-root status for a Session.
   * @param sessionId - Session whose workspace selects the wiki root.
   * @param signal - tab lifetime cancellation.
   */
  readonly loadStatus: (sessionId: SessionId, signal: AbortSignal) => Promise<WikiGraphStatus>
}

/** Minimal tab-owner share the body reads. */
export interface WikiGraphTabShare {
  readonly sessionId: SessionId
  readonly useTabInfo: () => { readonly tab: { readonly signal: AbortSignal } }
}

/** The body's composed props: session share, loader, and copy. */
export type WikiGraphBodyProps =
  & WikiGraphTabShare
  & WikiGraphInjected
  & PropsLocale<'wiki-tools'>

const EMPTY_COPY: Record<Exclude<WikiGraphStatusKind, 'ok'>, WikiToolsKey> = {
  'no-workspace': 'noWorkspace',
  'root-missing': 'rootMissing',
  'no-pages': 'noPages',
}

/**
 * Present wiki-root empty and error states in the knowledge-graph tab.
 * @param props - session share, status loader, and locale.
 * @returns the tab body.
 */
export function WikiGraphBody(props: WikiGraphBodyProps) {
  const signal = props.useTabInfo().tab.signal
  const [status, setStatus] = useState<WikiGraphStatus | undefined>()
  useEffect(() => {
    let cancelled = false
    void props.loadStatus(props.sessionId, signal).then((result) => {
      if (!cancelled && !signal.aborted) setStatus(result)
    })
    return () => { cancelled = true }
  }, [props.sessionId, props.loadStatus, signal])

  if (status === undefined) {
    return <div className={css.status} data-wiki-graph-state="loading" />
  }
  const copyKey = status.kind === 'ok' ? undefined : EMPTY_COPY[status.kind]
  return (
    <div className={css.status} data-wiki-graph-state={status.kind}>
      {copyKey === undefined ? null : <p className={css.statusLine}>{props.t(copyKey)}</p>}
    </div>
  )
}
