import { access, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, describe, expect, it } from 'vitest'

const artifactRunner = resolve(process.cwd(), '.output/server/migrate.mjs')
const migrationsDir = resolve(process.cwd(), '.output/server/db/migrations/postgresql')
const pgliteDataDir = join(tmpdir(), `openapi-artifact-migration-${process.pid}-${Date.now()}`)

afterAll(() => rm(pgliteDataDir, { recursive: true, force: true }))

function runArtifactMigration() {
  return new Promise<{ stderr: string, stdout: string }>((resolveProcess, reject) => {
    const child = spawn(process.execPath, [artifactRunner], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_DRIVER: 'pglite',
        DATABASE_URL: '',
        MIGRATIONS_DIR: '',
        NODE_ENV: 'production',
        PGLITE_DATA_DIR: pgliteDataDir,
        TZ: 'UTC'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', chunk => (stdout += chunk))
    child.stderr.setEncoding('utf8').on('data', chunk => (stderr += chunk))
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0 && signal === null) {
        resolveProcess({ stderr, stdout })
        return
      }
      reject(new Error(`Artifact migration exited with code ${code} and signal ${signal}.\n${stdout}\n${stderr}`))
    })
  })
}

describe('built database migration runner', () => {
  it('ships and applies the exact migration set from .output', async () => {
    await Promise.all([
      access(artifactRunner),
      access(resolve(process.cwd(), '.output/server/database-migrator.mjs')),
      access(resolve(migrationsDir, 'meta/_journal.json'))
    ])

    const { stdout } = await runArtifactMigration()
    expect(stdout).toContain('[db:migrate] Database is current through')

    const journal = JSON.parse(await readFile(resolve(migrationsDir, 'meta/_journal.json'), 'utf8'))
    const client = new PGlite(pgliteDataDir)
    await client.waitReady
    const result = await client.query<{ count: number }>(
      'select count(*)::int as count from drizzle.__drizzle_migrations'
    )
    await client.close()

    expect(result.rows[0]?.count).toBe(journal.entries.length)
  })
})
