/**
 * Host wiki-graph GET: session workspace probe as JSON, not an unclassified throw.
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { MemoryMediaPool, MemoryStorageBackend } from '../../../packages/storage/storage-domain/tests/helpers/memory-backend.ts'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionHeader } from '@deepseek-ai/dsh-session'
import { SessionPersistenceRevision } from '@deepseek-ai/dsh-session-persistence'
import WorkspaceRegistry from '@deepseek-ai/dsh-workspace'
import { apply, inject, WIKI_GRAPH_PATH } from '../src/index.ts'

const contexts: Context[] = []
const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
  for (const root of tempRoots.splice(0)) await rm(root, { recursive: true, force: true })
})

interface FetchRoute {
  readonly path: string
  readonly methods: readonly string[]
  readonly fetch: (request: Request) => Promise<Response>
}

async function boot(workspaceRoot: string): Promise<{
  route: FetchRoute
  sessionWithWorkspace: SessionId
  sessionWithoutWorkspace: SessionId
}> {
  const pool = new MemoryMediaPool()
  const ctx = new Context()
  contexts.push(ctx)
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend(pool))
  const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', facility)
  ctx.provide('storageDomain', facility)

  const persisted: SessionHeader[] = []
  ctx.provide('sessionPersistence', {
    list: async () => persisted.map(header => ({
      header,
      revision: SessionPersistenceRevision(`rev-${header.id}`),
    })),
    stat: async (id: SessionId) => {
      const header = persisted.find(entry => entry.id === id)
      return header === undefined ? undefined : { header, revision: SessionPersistenceRevision(`rev-${id}`) }
    },
    open: () => { throw new Error('event bodies must not be opened') },
  } as never)

  await ctx.plugin(SessionStore)
  await ctx.plugin(WorkspaceRegistry)

  const routes: FetchRoute[] = []
  ctx.provide('connection', {
    fetch: {
      register: (route: FetchRoute) => {
        routes.push(route)
        return () => {
          const index = routes.indexOf(route)
          if (index >= 0) routes.splice(index, 1)
        }
      },
    },
  } as never)

  const fiber = ctx.plugin({ inject: [...inject], apply }, { root: 'wiki' })
  await fiber.await()

  const sessionWithWorkspace = SessionId('session-with-workspace')
  const sessionWithoutWorkspace = SessionId('session-without-workspace')
  ctx.sessions.create(sessionWithWorkspace, { meta: { cwd: workspaceRoot } })
  ctx.sessions.create(sessionWithoutWorkspace, { meta: { cwd: workspaceRoot } })
  const workspace = await ctx.workspaceRegistry.create(workspaceRoot)
  await workspace.attachSession(sessionWithWorkspace)

  const route = routes.find(entry => entry.path === WIKI_GRAPH_PATH)
  if (route === undefined) throw new Error('wiki-graph GET was not registered')
  return { route, sessionWithWorkspace, sessionWithoutWorkspace }
}

async function getStatus(route: FetchRoute, sessionId: SessionId): Promise<{ status: number; body: unknown }> {
  const response = await route.fetch(new Request(`http://host${WIKI_GRAPH_PATH}?sessionId=${sessionId}`))
  return { status: response.status, body: await response.json() }
}

describe('wiki-tools Host GET', () => {
  it('reports no-workspace, a missing wiki root, and a wiki with no Markdown as JSON', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'dsh-wiki-tools-host-'))
    tempRoots.push(workspaceRoot)
    const { route, sessionWithWorkspace, sessionWithoutWorkspace } = await boot(workspaceRoot)

    expect(await getStatus(route, sessionWithoutWorkspace)).toEqual({
      status: 200,
      body: { kind: 'no-workspace' },
    })
    expect(await getStatus(route, sessionWithWorkspace)).toEqual({
      status: 200,
      body: { kind: 'root-missing' },
    })

    await mkdir(join(workspaceRoot, 'wiki'))
    expect(await getStatus(route, sessionWithWorkspace)).toEqual({
      status: 200,
      body: { kind: 'no-pages' },
    })

    await writeFile(join(workspaceRoot, 'wiki', 'index.md'), '# Index')
    expect(await getStatus(route, sessionWithWorkspace)).toEqual({
      status: 200,
      body: { kind: 'ok' },
    })
  })
})
