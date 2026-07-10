import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import postgres from 'postgres'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { useStorage } from '#imports'
import {
  createPgliteClient,
  createPgliteDatabase,
  createPostgresClient,
  getDatabaseDriver,
  getDatabaseUrl,
  getPgliteDataDir
} from './client'

interface MigrationFolder {
  path: string
  cleanup?: () => Promise<void>
}

const migrationsAssetBase = 'db-migrations'
const MIGRATION_ADVISORY_LOCK_KEY = 'openapi:database-migrations'

async function hasJournal(folder: string) {
  try {
    await fs.access(path.join(folder, 'meta/_journal.json'))
    return true
  } catch {
    return false
  }
}

async function findFilesystemMigrationsFolder() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.resolve(process.cwd(), '.output/server/db/migrations/postgresql'),
    path.resolve(process.cwd(), 'db/migrations/postgresql'),
    path.resolve(process.cwd(), 'server/db/migrations/postgresql'),
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    if (await hasJournal(candidate)) {
      return candidate
    }
  }

  return undefined
}

async function materializeBundledMigrations(): Promise<MigrationFolder> {
  const storage = useStorage('assets')
  const keys = (await storage.getKeys() as string[])
    .filter((key: string) => key.startsWith(`${migrationsAssetBase}/`))

  if (!keys.includes(`${migrationsAssetBase}/meta/_journal.json`)) {
    throw new Error(`Bundled database migrations are missing ${migrationsAssetBase}/meta/_journal.json.`)
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-migrations-'))

  await Promise.all(keys.map(async (key: string) => {
    const content = await storage.getItem<string>(key)
    if (typeof content !== 'string') return

    const outputPath = path.join(tempRoot, key.slice(`${migrationsAssetBase}/`.length))
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, content)
  }))

  return {
    path: tempRoot,
    cleanup: () => fs.rm(tempRoot, { recursive: true, force: true })
  }
}

async function resolveMigrationsFolder(): Promise<MigrationFolder> {
  const filesystemFolder = await findFilesystemMigrationsFolder()

  if (filesystemFolder) {
    return { path: filesystemFolder }
  }

  return materializeBundledMigrations()
}

async function ensureDatabaseExists() {
  const databaseUrl = getDatabaseUrl()
  const url = new URL(databaseUrl)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.')
  }

  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'

  const adminClient = postgres(adminUrl.toString(), { max: 1 })

  try {
    const rows = await adminClient`
      SELECT 1 FROM pg_database WHERE datname = ${databaseName}
    `

    if (rows.length > 0) return

    try {
      await adminClient`CREATE DATABASE ${adminClient(databaseName)}`
      console.log(`[db:migrate] Created database ${databaseName}`)
    } catch (error) {
      if (getSqlState(error) !== '42P04') throw error
    }
  } finally {
    await adminClient.end()
  }
}

function getSqlState(error: unknown) {
  if (!error || typeof error !== 'object') return undefined

  const direct = 'code' in error ? error.code : undefined
  if (typeof direct === 'string') return direct

  const cause = 'cause' in error ? error.cause : undefined
  if (!cause || typeof cause !== 'object') return undefined

  const causeCode = 'code' in cause ? cause.code : undefined
  return typeof causeCode === 'string' ? causeCode : undefined
}

async function migrateOnce(migrationsFolder: string) {
  const client = createPostgresClient({ max: 1 })
  const database = drizzlePostgres(client)
  let hasMigrationLock = false

  try {
    await client`SELECT pg_advisory_lock(hashtext(${MIGRATION_ADVISORY_LOCK_KEY}))`
    hasMigrationLock = true
    await migrate(database, {
      migrationsFolder,
      migrationsSchema: 'drizzle',
      migrationsTable: '__drizzle_migrations'
    })
    console.log(`[db:migrate] Applied migrations from ${migrationsFolder}`)
  } finally {
    if (hasMigrationLock) {
      await client`SELECT pg_advisory_unlock(hashtext(${MIGRATION_ADVISORY_LOCK_KEY}))`.catch((error) => {
        console.error('[db:migrate] Failed to release migration advisory lock', error)
      })
    }
    await client.end()
  }
}

async function migratePgliteOnce(migrationsFolder: string) {
  const { migrate: migratePglite } = await import('drizzle-orm/pglite/migrator')
  const client = createPgliteClient()
  await client.waitReady

  try {
    await migratePglite(createPgliteDatabase(client), {
      migrationsFolder,
      migrationsSchema: 'drizzle',
      migrationsTable: '__drizzle_migrations'
    })
    console.log(`[db:migrate] Applied migrations from ${migrationsFolder} to PGlite ${getPgliteDataDir()}`)
  } finally {
    await client.close()
  }
}

export async function runDatabaseMigrations() {
  const migrationsFolder = await resolveMigrationsFolder()
  const driver = getDatabaseDriver()

  try {
    if (driver === 'pglite') {
      await migratePgliteOnce(migrationsFolder.path)
      return
    }

    try {
      await migrateOnce(migrationsFolder.path)
    } catch (error) {
      if (getSqlState(error) !== '3D000') throw error

      await ensureDatabaseExists()
      await migrateOnce(migrationsFolder.path)
    }
  } finally {
    await migrationsFolder.cleanup?.()
  }
}
