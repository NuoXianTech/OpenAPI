import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function findMigrationsFolder() {
  const candidates = [
    process.env.MIGRATIONS_DIR,
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

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required before running database migrations.')
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

  const adminClient = postgres(adminUrl.toString(), { max: 1 })
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
  const client = postgres(databaseUrl, { max: 1 })
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

try {
  await migrateOnce()
} catch (err) {
  if (err?.cause?.code !== '3D000') throw err

  await ensureDatabaseExists()
  await migrateOnce()
}
