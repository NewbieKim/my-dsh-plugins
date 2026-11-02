/** Probe whether a session workspace has a usable wiki root with Markdown pages. */

import { readdir, stat } from 'node:fs/promises'
import { isAbsolute, join, normalize, relative, sep } from 'node:path'
import { DEFAULT_WIKI_ROOT } from './types.ts'
import type { WikiGraphProbeRequest, WikiGraphStatus } from './types.ts'

export { DEFAULT_WIKI_ROOT } from './types.ts'
export type { WikiGraphProbeRequest, WikiGraphStatus, WikiGraphStatusKind } from './types.ts'

/** Directory names the wiki scan never enters. */
const SKIP_DIRS = new Set(['.obsidian', 'node_modules', '.git'])

/**
 * Classify the wiki root for a session workspace without parsing page links.
 * @param request - workspace location and optional relative wiki root.
 * @returns a status the tab body can present as empty, error, or ready.
 */
// 探测知识图谱根目录是否存在
export async function probeWikiGraph(request: WikiGraphProbeRequest): Promise<WikiGraphStatus> {
  if (request.workspaceRoot === undefined) return { kind: 'no-workspace' }
  const wikiRoot = resolveWikiRoot(request.workspaceRoot, request.root ?? DEFAULT_WIKI_ROOT)
  if (wikiRoot === undefined) return { kind: 'root-missing' }
  try {
    const info = await stat(wikiRoot)
    if (!info.isDirectory()) return { kind: 'root-missing' }
  } catch {
    return { kind: 'root-missing' }
  }
  return { kind: await hasMarkdownPages(wikiRoot) ? 'ok' : 'no-pages' }
}

/**
 * Whether the wiki root contains at least one Markdown page.
 * @param dir - absolute directory currently being walked.
 * @returns true when a `.md` file exists outside skipped directories.
 */
// 判断知识图谱根目录是否包含至少一个 Markdown 页面
async function hasMarkdownPages(dir: string): Promise<boolean> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      if (await hasMarkdownPages(join(dir, entry.name))) return true
      continue
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) return true
  }
  return false
}

/**
 * Resolve a configured wiki root inside the workspace, or refuse an escape.
 * @param workspaceRoot - absolute workspace directory.
 * @param root - configured relative wiki root.
 * @returns the absolute wiki directory, or undefined when the root is not inside the workspace.
 */
// 解析知识图谱根目录
// 返回知识图谱根目录，如果根目录不在工作区则返回 undefined
function resolveWikiRoot(workspaceRoot: string, root: string): string | undefined {
  if (root.length === 0 || isAbsolute(root)) return undefined
  const candidate = normalize(join(workspaceRoot, root))
  const escaped = relative(workspaceRoot, candidate)
  if (escaped.startsWith('..') || escaped.split(sep).includes('..')) return undefined
  return candidate
}
