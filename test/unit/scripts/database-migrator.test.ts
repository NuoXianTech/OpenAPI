import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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
      databaseUrl: '',
      migrationsDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })
    await runDatabaseMigrations({
      databaseUrl: '',
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
  }, 20_000)

  it('upgrades a populated v0.1.0 database without losing published data', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const dataDir = await createTemporaryDirectory()
    const baselineDir = await createTemporaryDirectory()
    const journal = JSON.parse(await readFile(join(migrationsDir, 'meta/_journal.json'), 'utf8'))
    const baselineEntry = journal.entries[0]
    await mkdir(join(baselineDir, 'meta'))
    await copyFile(
      join(migrationsDir, `${baselineEntry.tag}.sql`),
      join(baselineDir, `${baselineEntry.tag}.sql`)
    )
    await writeFile(
      join(baselineDir, 'meta/_journal.json'),
      JSON.stringify({ ...journal, entries: [baselineEntry] }, null, 2)
    )

    await runDatabaseMigrations({
      databaseUrl: '',
      migrationsDir: baselineDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })

    const legacyClient = new PGlite(dataDir)
    await legacyClient.waitReady
    await legacyClient.exec(`
      INSERT INTO users (id, username, email, password_hash, credits, is_active)
      VALUES
        (1, 'first', 'first@example.test', 'hash', 10, true),
        (2, 'second', 'second@example.test', 'hash', 20, true);
      INSERT INTO notification_messages (id, title, content, audience, recipient_count)
      VALUES (1, 'Legacy broadcast', 'Body', 'all_current', 2);
      INSERT INTO notification_deliveries (message_id, recipient_user_id, is_read, read_at)
      VALUES
        (1, 1, false, null),
        (1, 2, true, now());
      INSERT INTO workspaces (id, slug, name)
      VALUES ('00000000-0000-4000-8000-000000000001', 'default', 'Default');
      INSERT INTO environments (id, workspace_id, slug, name)
      VALUES (
        '00000000-0000-4000-8000-000000000002',
        '00000000-0000-4000-8000-000000000001',
        'development',
        'Development'
      );
      INSERT INTO routing_revisions (
        id, workspace_id, environment_id, sequence, status,
        config_payload, checksum, published_at
      ) VALUES (
        '00000000-0000-4000-8000-000000000003',
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000002',
        1,
        'published',
        '{}',
        'legacy-checksum',
        null
      );
      UPDATE environments
      SET active_revision_id = '00000000-0000-4000-8000-000000000003'
      WHERE id = '00000000-0000-4000-8000-000000000002';
      INSERT INTO api_calls (route_id, target_name, path, method, status_code)
      VALUES (
        '00000000-0000-4000-8000-000000000004',
        'Legacy route',
        '/legacy',
        'GET',
        200
      );
    `)
    await legacyClient.close()

    await runDatabaseMigrations({
      databaseUrl: '',
      migrationsDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })

    const upgradedClient = new PGlite(dataDir)
    await upgradedClient.waitReady
    const [message, revision, call] = await Promise.all([
      upgradedClient.query<{ recipient_cutoff_user_id: number }>(
        'select recipient_cutoff_user_id from notification_messages where id = 1'
      ),
      upgradedClient.query<{ published_at: Date }>(
        'select published_at from routing_revisions where id = $1',
        ['00000000-0000-4000-8000-000000000003']
      ),
      upgradedClient.query<{ route_name: string }>(
        'select route_name from api_calls where path = $1',
        ['/legacy']
      )
    ])
    expect(message.rows[0]?.recipient_cutoff_user_id).toBe(2)
    expect(revision.rows[0]?.published_at).toBeTruthy()
    expect(call.rows[0]?.route_name).toBe('Legacy route')
    await expect(upgradedClient.exec(`
      UPDATE notification_deliveries
      SET is_read = true, read_at = null
      WHERE message_id = 1 AND recipient_user_id = 1;
    `)).rejects.toThrow()
    await upgradedClient.close()
  }, 20_000)

  it('rejects an incomplete configured migration directory', async () => {
    const dataDir = await createTemporaryDirectory()
    const incompleteMigrationsDir = await createTemporaryDirectory()

    await expect(runDatabaseMigrations({
      databaseUrl: '',
      migrationsDir: incompleteMigrationsDir,
      pgliteDataDir: dataDir,
      timeZone: 'UTC'
    })).rejects.toThrow('has no meta/_journal.json')
  })
})
