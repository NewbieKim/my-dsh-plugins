/**
 * wiki-tools plugin, Host half: GET probe for the knowledge-graph tab.
 * @module dsh-wiki-tools
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-workspace'
import { probeWikiGraph } from './probe.ts'
import { DEFAULT_WIKI_ROOT } from './types.ts'
import { WIKI_GRAPH_PATH } from './routes.ts'
import { resolveWorkspaceRoot } from './workspace-root.ts'

export { WIKI_GRAPH_PATH, WIKI_GRAPH_ROUTE } from './routes.ts'
export { probeWikiGraph } from './probe.ts'
export { DEFAULT_WIKI_ROOT } from './types.ts'
export type { WikiGraphProbeRequest, WikiGraphStatus, WikiGraphStatusKind } from './types.ts'

/** Stable Cordis plugin name, matching the bundle-patch entry id. */
export const name = 'wiki-tools'

/** Host services the graph probe reads. */
export const inject = ['connection', 'sessions', 'workspaceRegistry', 'sessionPersistence'] as const

/** Wiki-root configuration for this plugin instance. */
export interface Config {
  /** Wiki directory relative to the session workspace. @default wiki */
  readonly root: string
}

/** Validate wiki-tools Host configuration. */
export const Config: Schema<Config> = Schema.object({
  root: Schema.string().default(DEFAULT_WIKI_ROOT),
})

/**
 * Register the authenticated wiki-graph probe GET.
 * @param ctx - Host context carrying connection and workspace services.
 * @param config - resolved wiki-root policy.
 */
export function apply(ctx: Context, config: Config = { root: DEFAULT_WIKI_ROOT }): void {
  const root = config.root
  ctx.effect(() => ctx.connection.fetch.register({
    path: WIKI_GRAPH_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      const sessionIdValue = new URL(request.url).searchParams.get('sessionId')
      if (sessionIdValue === null || sessionIdValue.length === 0) {
        return Response.json({ error: 'missing sessionId' }, { status: 400 })
      }
      const workspaceRoot = await resolveWorkspaceRoot(ctx, SessionId(sessionIdValue))
      const status = await probeWikiGraph({ workspaceRoot, root })
      return Response.json(status)
    },
  }), 'wiki-tools: graph GET')
}
