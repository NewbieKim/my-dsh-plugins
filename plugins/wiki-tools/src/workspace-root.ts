/**
 * Resolve a Session's workspace directory via workspace entity membership.
 */

import type { Context } from '@deepseek-ai/cordis' // cordis 上下文
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { realpathNormalize } from '@deepseek-ai/dsh-workspace' // 工作区路径规范化
import type {} from '@deepseek-ai/dsh-session' // dsh-session 类型
import type {} from '@deepseek-ai/dsh-session-persistence' // dsh-session-persistence 类型
import type {} from '@deepseek-ai/dsh-workspace' // dsh-workspace 类型

/**
 * Locate the workspace directory bound to a Session, if any.
 * @param ctx - Host context with sessions and workspace registry.
 * @param sessionId - wire Session identity.
 * @returns absolute workspace path, or undefined when the session has no workspace entity.
 */
// 解析工作区根目录
// 返回工作区路径，如果没有工作区则返回 undefined
export async function resolveWorkspaceRoot(ctx: Context, sessionId: SessionId): Promise<string | undefined> {
  const registry = ctx.get('workspaceRegistry')
  if (registry === undefined) return undefined

  const live = ctx.sessions.get(sessionId)?.header
  const stored = live === undefined
    ? await ctx.get('sessionPersistence')?.stat(sessionId)
    : undefined
  const header = live ?? stored?.header
  if (header?.cwd === undefined) return undefined

  let canonicalCwd: string
  try {
    canonicalCwd = await realpathNormalize(header.cwd)
  } catch {
    return undefined
  }

  for (const workspace of registry.list()) {
    if (!workspace.sessionIds.includes(sessionId)) continue
    if (workspace.path !== canonicalCwd) continue
    return workspace.path
  }
  return undefined
}
