// Standalone migration runner used by `pnpm db:migrate` for manual repair,
// rehearsals, or one-off maintenance. Normal production startup runs the same
// Drizzle migrations from the Nitro startup plugin.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
    path.resolve(process.cwd(), '.output/server/db/migrations/postgresql'),
    path.resolve(process.cwd(), 'server/db/migrations/postgresql'),
    path.resolve(process.cwd(), 'db/migrations/postgresql'),
    path.resolve(__dirname, '../server/db/migrations/postgresql'),
    path.resolve(__dirname, 'db/migrations/postgresql')
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'meta/_journal.json'))) {
      return candidate
    }
  }

  throw new Error(`Cannot find migrations folder. Tried:\n${candidates.join('\n')}`)
}

const configuredDriver = process.env.DATABASE_DRIVER
if (configuredDriver && configuredDriver !== 'postgres' && configuredDriver !== 'pglite') {
  throw new Error('DATABASE_DRIVER must be either "postgres" or "pglite".')
}

const databaseUrl = process.env.POSTGRES_URL || process.env.POSTGRESQL_URL || process.env.DATABASE_URL
const shouldUsePglite = configuredDriver === 'pglite'
  || (!configuredDriver && !databaseUrl && process.env.NODE_ENV !== 'production')
const pgliteDataDir = process.env.PGLITE_DATA_DIR || '.data/pglite'

if (!databaseUrl && !shouldUsePglite) {
  throw new Error('DATABASE_DRIVER=pglite or DATABASE_URL, POSTGRES_URL, or POSTGRESQL_URL is required before running database migrations.')
}

const migrationsFolder = findMigrationsFolder()

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

    await adminClient`CREATE DATABASE ${adminClient(databaseName)}`
    console.log(`[db:migrate] Created database ${databaseName}`)
  } finally {
    await adminClient.end()
  }
}

async function migrateOnce() {
  const client = postgres(databaseUrl, { max: 1, onnotice })
  const db = drizzle(client)

  try {
    await migrate(db, {
      migrationsFolder,
      migrationsSchema: 'drizzle',
      migrationsTable: '__drizzle_migrations'
    })
    console.log(`[db:migrate] Applied migrations from ${migrationsFolder}`)
  } finally {
    await client.end()
  }
}

async function migratePgliteOnce() {
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate: migratePglite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator')
  ])
  const client = new PGlite(pgliteDataDir)
  await client.waitReady

  try {
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
  if (err?.cause?.code !== '3D000') throw err

  await ensureDatabaseExists()
  await migrateOnce()
}
