import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import postgres from 'postgres'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import type { PGlite } from '@electric-sql/pglite'
import type { drizzle as drizzlePgliteDriver } from 'drizzle-orm/pglite'
import * as schema from './schema'

export interface CreatePostgresClientOptions {
  max?: number
}

interface PgliteModule {
  PGlite: typeof PGlite
}

interface PgliteDriverModule {
  drizzle: typeof drizzlePgliteDriver
}

interface PgliteRuntime {
  pgliteModule: PgliteModule
  driverModule: PgliteDriverModule
}

export type PostgresClient = ReturnType<typeof postgres>
export type PgliteClient = PGlite
export type DatabaseDriver = 'postgres' | 'pglite'

let pgliteRuntime: PgliteRuntime | undefined

function getRequireCandidates() {
  const entryFile = process.argv[1] ? resolve(process.argv[1]) : undefined

  return [
    entryFile ? join(dirname(entryFile), 'package.json') : undefined,
    join(process.cwd(), 'server/package.json'),
    join(process.cwd(), '.output/server/package.json'),
    join(process.cwd(), 'package.json')
  ].filter((candidate): candidate is string => Boolean(candidate))
}

function loadPgliteRuntime() {
  let lastError: unknown

  for (const candidate of getRequireCandidates()) {
    try {
      const runtimeRequire = createRequire(candidate)
      return {
        pgliteModule: runtimeRequire('@electric-sql/pglite') as PgliteModule,
        driverModule: runtimeRequire('drizzle-orm/pglite') as PgliteDriverModule
      }
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

function getPgliteRuntime() {
  if (!pgliteRuntime) {
    pgliteRuntime = loadPgliteRuntime()
  }

  return pgliteRuntime
}

function handlePostgresNotice(notice: postgres.Notice) {
  if (notice.code === '42P06' || notice.code === '42P07') return
  console.log(notice)
}

export function getOptionalDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.POSTGRESQL_URL || process.env.DATABASE_URL
}

export function hasDatabaseUrl() {
  return Boolean(getOptionalDatabaseUrl())
}

export function getDatabaseDriver(): DatabaseDriver {
  const configuredDriver = process.env.DATABASE_DRIVER
  if (configuredDriver === 'postgres' || configuredDriver === 'pglite') {
    return configuredDriver
  }
  if (configuredDriver) {
    throw new Error('DATABASE_DRIVER must be either "postgres" or "pglite".')
  }

  if (hasDatabaseUrl()) return 'postgres'

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_DRIVER=pglite or DATABASE_URL, POSTGRES_URL, or POSTGRESQL_URL is required in production.')
  }

  return 'pglite'
}

export function getDatabaseUrl() {
  const databaseUrl = getOptionalDatabaseUrl()

  if (!databaseUrl) {
    throw new Error('DATABASE_URL, POSTGRES_URL, or POSTGRESQL_URL is required.')
  }

  return databaseUrl
}

export function getDatabasePoolSize() {
  const parsed = Number.parseInt(process.env.DATABASE_POOL_SIZE || '10', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

export function createPostgresClient(options: CreatePostgresClientOptions = {}) {
  return postgres(getDatabaseUrl(), {
    max: options.max ?? getDatabasePoolSize(),
    onnotice: handlePostgresNotice
  })
}

export function getPgliteDataDir() {
  return process.env.PGLITE_DATA_DIR || '.data/pglite'
}

function isFilesystemPgliteDataDir(dataDir: string) {
  return !/^[a-z][a-z0-9+.-]*:\/\//i.test(dataDir)
}

export function ensurePgliteDataDir(dataDir = getPgliteDataDir()) {
  if (!isFilesystemPgliteDataDir(dataDir)) return

  mkdirSync(resolve(dataDir), { recursive: true })
}

export function createPgliteClient() {
  const { PGlite: PGliteConstructor } = getPgliteRuntime().pgliteModule
  const dataDir = getPgliteDataDir()
  ensurePgliteDataDir(dataDir)
  return new PGliteConstructor(dataDir)
}

export function createDatabase(client: PostgresClient) {
  return drizzlePostgres(client, { schema })
}

export function createPgliteDatabase(client: PgliteClient) {
  const { drizzle: drizzlePglite } = getPgliteRuntime().driverModule
  return drizzlePglite(client, { schema })
}

export type Database = ReturnType<typeof createDatabase>
export type DatabaseTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]

let sqlClient: PostgresClient | undefined
let pgliteClient: PgliteClient | undefined
let database: Database | undefined

export function getDb() {
  const driver = getDatabaseDriver()

  if (driver === 'postgres' && !sqlClient) {
    sqlClient = createPostgresClient()
  }

  if (driver === 'pglite' && !pgliteClient) {
    pgliteClient = createPgliteClient()
  }

  if (!database) {
    database = driver === 'postgres'
      ? createDatabase(sqlClient!)
      : createPgliteDatabase(pgliteClient!) as unknown as Database
  }

  return database
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    return Reflect.get(getDb(), property)
  }
})

export { schema }
