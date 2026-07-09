import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ensurePgliteDataDir } from '~~/server/db/client'

const tempRoots: string[] = []

describe('database client utilities', () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('creates nested filesystem directories for PGlite data', () => {
    const root = mkdtempSync(join(tmpdir(), 'openapi-pglite-'))
    tempRoots.push(root)

    const dataDir = join(root, 'nested', 'pglite')
    ensurePgliteDataDir(dataDir)

    expect(existsSync(dataDir)).toBe(true)
  })
})
