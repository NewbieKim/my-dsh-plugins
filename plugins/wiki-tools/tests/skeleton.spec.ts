import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCordisYaml } from '../../../scripts/cordis-yaml.ts'
import pkg from '../package.json'

const pluginRoot = join(import.meta.dirname, '..')

type PatchInsert = { id?: string; name?: string }

/**
 * Collect loader entry rows from a bundle patch document.
 * @param document - parsed Cordis patch YAML.
 * @returns insert rows declared by the patch.
 */
function patchInserts(document: unknown): PatchInsert[] {
  if (!Array.isArray(document)) return []
  const rows: PatchInsert[] = []
  for (const item of document) {
    if (typeof item !== 'object' || item === null) continue
    const insert = (item as { insert?: unknown }).insert
    if (!Array.isArray(insert)) continue
    for (const row of insert) {
      if (typeof row === 'object' && row !== null) rows.push(row as PatchInsert)
    }
  }
  return rows
}

describe('dsh-wiki-tools tree-outside skeleton', () => {
  it('declares a web-only dsh-wiki-tools package whose Cordis id is wiki-tools', () => {
    expect(pkg.name).toBe('dsh-wiki-tools')
    expect(pkg.name).not.toMatch(/^@/)
    expect(pkg.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh?.client?.platform).toBe('web')
    for (const file of ['cordis.patch.yml', 'cordis.source.patch.yml'] as const) {
      const document = loadCordisYaml(readFileSync(join(pluginRoot, file), 'utf8'))
      const inserts = patchInserts(document)
      expect(inserts, file).toHaveLength(1)
      expect(inserts[0]?.id, file).toBe('wiki-tools')
      expect(inserts[0]?.name, file).toBe('dsh-wiki-tools')
    }
  })
})
