import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { probeWikiGraph } from '../src/probe.ts'

const tempRoots: string[] = []

afterEach(async () => {
  for (const root of tempRoots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe('wiki-graph probe', () => {
  it('reports no-workspace when the session has no workspace root', async () => {
    expect(await probeWikiGraph({ workspaceRoot: undefined })).toEqual({ kind: 'no-workspace' })
  })

  it('reports root-missing when the wiki directory does not exist', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'dsh-wiki-tools-missing-'))
    tempRoots.push(workspaceRoot)
    expect(await probeWikiGraph({ workspaceRoot })).toEqual({ kind: 'root-missing' })
  })

  it('reports no-pages when the wiki root has no Markdown files', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'dsh-wiki-tools-empty-'))
    tempRoots.push(workspaceRoot)
    await mkdir(join(workspaceRoot, 'wiki'))
    await writeFile(join(workspaceRoot, 'wiki', 'notes.txt'), 'not markdown')
    expect(await probeWikiGraph({ workspaceRoot })).toEqual({ kind: 'no-pages' })
  })

  it('reports no-pages when Markdown files live only under skipped directories', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'dsh-wiki-tools-skip-'))
    tempRoots.push(workspaceRoot)
    await mkdir(join(workspaceRoot, 'wiki', '.obsidian'), { recursive: true })
    await writeFile(join(workspaceRoot, 'wiki', '.obsidian', 'workspace.md'), '# vault')
    expect(await probeWikiGraph({ workspaceRoot })).toEqual({ kind: 'no-pages' })
  })

  it('reports ok when the wiki root contains a nested Markdown page', async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), 'dsh-wiki-tools-ok-'))
    tempRoots.push(workspaceRoot)
    await mkdir(join(workspaceRoot, 'wiki', 'concepts'), { recursive: true })
    await writeFile(join(workspaceRoot, 'wiki', 'concepts', 'index.md'), '# Index')
    expect(await probeWikiGraph({ workspaceRoot })).toEqual({ kind: 'ok' })
  })
})
