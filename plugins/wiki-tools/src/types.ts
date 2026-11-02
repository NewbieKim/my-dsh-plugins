/** Wiki-root presence status shared by Host probe and Client tab body. */

/** Default wiki root relative to the session workspace. */
export const DEFAULT_WIKI_ROOT = 'wiki'

/** Stable empty-or-ready kinds the knowledge-graph tab consumes. */
export type WikiGraphStatusKind = 'no-workspace' | 'root-missing' | 'no-pages' | 'ok'

/** Result of a wiki-root presence check. Graph parsing is a later slice. */
export interface WikiGraphStatus {
  readonly kind: WikiGraphStatusKind
}

/** Inputs for one wiki-root presence check. */
export interface WikiGraphProbeRequest {
  /** Absolute workspace directory, or absent when the session has no workspace. */
  readonly workspaceRoot: string | undefined
  /** Wiki root relative to the workspace. Defaults to `wiki`. */
  readonly root?: string
}
