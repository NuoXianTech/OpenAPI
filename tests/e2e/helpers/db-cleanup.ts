import postgres, { type Sql } from 'postgres'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let sqlClient: Sql | null = null

function resolveDatabaseUrlFromEnvFile() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    return null
  }

  const content = readFileSync(envPath, 'utf8')
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (key !== 'DATABASE_URL') {
      continue
    }

    const rawValue = trimmed.slice(separatorIndex + 1).trim()
    const unquoted = rawValue.replace(/^"|"$/g, '')
    return unquoted || null
  }

  return null
}

function getSqlClient() {
  if (sqlClient) {
    return sqlClient
  }

  const connectionString = process.env.DATABASE_URL || resolveDatabaseUrlFromEnvFile()
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for call-stats cleanup tests')
  }

  sqlClient = postgres(connectionString, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 10,
  })

  return sqlClient
}

export async function deleteApiCallsByApiId(apiId: number) {
  const sql = getSqlClient()
  await sql`delete from api_calls where api_id = ${apiId}`
}

export async function deleteApiCallStatsByApiId(apiId: number) {
  const sql = getSqlClient()
  await sql`delete from api_call_stats where api_id = ${apiId}`
}

export async function closeDbClient() {
  if (!sqlClient) {
    return
  }

  await sqlClient.end({ timeout: 5 })
  sqlClient = null
}
