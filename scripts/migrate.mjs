// Standalone migration runner used by `pnpm db:migrate` for manual repair,
// rehearsals, or one-off maintenance. Normal production startup runs the same
// Drizzle migrations from the Nitro startup plugin.
import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const MIGRATION_ADVISORY_LOCK_KEY = 'openapi:database-migrations'

function loadProjectEnv() {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return

  process.loadEnvFile(envPath)
}

// drizzle's migrator issues `CREATE SCHEMA/TABLE IF NOT EXISTS` for its own
// bookkeeping (the `drizzle` schema + `__drizzle_migrations` tracking table).
// After the first run these already exist, so Postgres returns the harmless
// 42P06/42P07 NOTICEs on every restart. postgres-js console.logs any unhandled
// notice, so swallow just these two and surface anything genuinely unexpected.
function onnotice(notice) {
  if (notice.code === '42P06' || notice.code === '42P07') return
  console.log(notice)
}

function findMigrationsFolder() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
    path.resolve(process.cwd(), 'server/db/migrations/postgresql'),
    path.resolve(process.cwd(), '.output/server/db/migrations/postgresql')
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'meta/_journal.json'))) {
      return candidate
    }
  }

  throw new Error(`Cannot find migrations folder. Tried:\n${candidates.join('\n')}`)
}

function getSqlState(error) {
  if (!error || typeof error !== 'object') return undefined

  const direct = 'code' in error ? error.code : undefined
  if (typeof direct === 'string') return direct

  const cause = 'cause' in error ? error.cause : undefined
  if (!cause || typeof cause !== 'object') return undefined

  const causeCode = 'code' in cause ? cause.code : undefined
  return typeof causeCode === 'string' ? causeCode : undefined
}

function isFilesystemPgliteDataDir(dataDir) {
  return !/^[a-z][a-z0-9+.-]*:\/\//i.test(dataDir)
}

function ensurePgliteDataDir(dataDir) {
  if (!isFilesystemPgliteDataDir(dataDir)) return

  fs.mkdirSync(path.resolve(dataDir), { recursive: true })
}

loadProjectEnv()

const APP_TIME_ZONE = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone
const configuredDriver = process.env.DATABASE_DRIVER
if (configuredDriver && configuredDriver !== 'postgres' && configuredDriver !== 'pglite') {
  throw new Error('DATABASE_DRIVER must be either "postgres" or "pglite".')
}

const databaseUrl = process.env.DATABASE_URL
const shouldUsePglite = configuredDriver === 'pglite'
  || (!configuredDriver && !databaseUrl && process.env.NODE_ENV !== 'production')
const pgliteDataDir = process.env.PGLITE_DATA_DIR || '.data/pglite'

if (!databaseUrl && !shouldUsePglite) {
  throw new Error('DATABASE_DRIVER=pglite or DATABASE_URL is required before running database migrations.')
}

const migrationsFolder = findMigrationsFolder()
const postgresTarget = databaseUrl
  ? (() => {
      const url = new URL(databaseUrl)
      return `${url.protocol}//${url.host}${url.pathname}`
    })()
  : undefined
const migrationTarget = shouldUsePglite
  ? `PGlite ${pgliteDataDir}`
  : postgresTarget

console.log(`[db:migrate] Target: ${shouldUsePglite ? 'pglite' : 'postgres'} (${migrationTarget})`)

async function ensureDatabaseExists() {
  const url = new URL(databaseUrl)
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.')
  }

  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'

  const adminClient = postgres(adminUrl.toString(), { max: 1, onnotice })
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

async function migrateOnce() {
  const client = postgres(databaseUrl, { max: 1, onnotice })
  const db = drizzle(client)
  let hasMigrationLock = false

  try {
    await client`select set_config('TimeZone', ${APP_TIME_ZONE}, false)`
    await client`SELECT pg_advisory_lock(hashtext(${MIGRATION_ADVISORY_LOCK_KEY}))`
    hasMigrationLock = true
    await migrate(db, {
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

async function migratePgliteOnce() {
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate: migratePglite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator')
  ])
  ensurePgliteDataDir(pgliteDataDir)
  const client = new PGlite(pgliteDataDir)
  await client.waitReady

  try {
    await client.query('select set_config($1, $2, false)', ['TimeZone', APP_TIME_ZONE])
    await migratePglite(drizzlePglite(client), {
      migrationsFolder,
      migrationsSchema: 'drizzle',
      migrationsTable: '__drizzle_migrations'
    })
    console.log(`[db:migrate] Applied migrations from ${migrationsFolder} to PGlite ${pgliteDataDir}`)
  } finally {
    await client.close()
  }
}

if (shouldUsePglite) {
  await migratePgliteOnce()
  process.exit(0)
}

try {
  await migrateOnce()
} catch (err) {
  if (getSqlState(err) !== '3D000') throw err

  await ensureDatabaseExists()
  await migrateOnce()
}
