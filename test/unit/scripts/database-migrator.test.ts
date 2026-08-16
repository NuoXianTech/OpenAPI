import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runDatabaseMigrations } from '../../../scripts/database-migrator.mjs'

const migrationsDir = resolve(process.cwd(), 'server/db/migrations/postgresql')
const temporaryDirectories: string[] = []

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'openapi-migrator-test-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(temporaryDirectories.splice(0).map(directory => (
    rm(directory, { recursive: true, force: true })
  )))
})

describe('database migration runner', () => {
  it('applies the release migration set idempotently', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const dataDir = await createTemporaryDirectory()

    await runDatabaseMigrations({
      driver: 'pglite',
      migrationsDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })
    await runDatabaseMigrations({
      driver: 'pglite',
      migrationsDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })

    const journal = JSON.parse(await readFile(join(migrationsDir, 'meta/_journal.json'), 'utf8'))
    const client = new PGlite(dataDir)
    await client.waitReady
    const result = await client.query<{ count: number }>(
      'select count(*)::int as count from drizzle.__drizzle_migrations'
    )
    await client.close()

    expect(result.rows[0]?.count).toBe(journal.entries.length)
  })

  it('rejects an incomplete configured migration directory', async () => {
    const dataDir = await createTemporaryDirectory()
    const incompleteMigrationsDir = await createTemporaryDirectory()

    await expect(runDatabaseMigrations({
      driver: 'pglite',
      migrationsDir: incompleteMigrationsDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })).rejects.toThrow('has no meta/_journal.json')
  })
})
