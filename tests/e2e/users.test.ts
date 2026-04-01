import { randomBytes, scrypt as scryptCallback } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, describe, expect, it } from 'vitest'
import { fetch as e2eFetch } from '@nuxt/test-utils/e2e'
import postgres, { type Sql } from 'postgres'
import { createAdminClient, loginAsAdmin } from './helpers/admin-client'
import { createRegisterPayload } from './helpers/fixtures'
import { setupE2E } from './helpers/setup'

await setupE2E()

interface UserItem {
  id: number
  username: string
  email: string
  isActive: boolean
  isBanned: boolean
}

const scrypt = promisify(scryptCallback)
const SALT_BYTES = 16
const KEY_LENGTH = 64
let dbClient: Sql | null = null

function base64UrlEncode(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buffer.toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES)
  const derived = await scrypt(password, salt, KEY_LENGTH) as Buffer
  return `scrypt$${base64UrlEncode(salt)}$${base64UrlEncode(derived)}`
}

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

function getDbClient() {
  if (dbClient) {
    return dbClient
  }

  const connectionString = process.env.DATABASE_URL || resolveDatabaseUrlFromEnvFile()
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for users e2e tests')
  }

  dbClient = postgres(connectionString, {
    max: 1,
    idle_timeout: 1,
    connect_timeout: 10,
  })

  return dbClient
}

async function seedUser(options: { isActive: boolean }) {
  const payload = createRegisterPayload()
  const passwordHash = await hashPassword(payload.password)
  const sql = getDbClient()

  const rows = await sql<Array<UserItem & { passwordHash: string }>>`
    insert into users (
      username,
      display_name,
      email,
      password_hash,
      is_active,
      is_banned,
      email_verified_at
    ) values (
      ${payload.username},
      ${payload.username},
      ${payload.email},
      ${passwordHash},
      ${options.isActive},
      false,
      ${options.isActive ? new Date() : null}
    )
    returning id, username, email, is_active as "isActive", is_banned as "isBanned", password_hash as "passwordHash"
  `

  const user = rows[0]
  if (!user) {
    throw new Error('Failed to seed test user')
  }

  return {
    payload,
    user,
  }
}

afterAll(async () => {
  if (!dbClient) {
    return
  }

  await dbClient.end({ timeout: 5 })
  dbClient = null
})

describe('user lifecycle e2e', () => {
  it('creates an unactivated user and blocks login before activation', async () => {
    const { payload, user } = await seedUser({ isActive: false })
    expect(user.isActive).toBe(false)

    const loginResponse = await e2eFetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    })

    expect(loginResponse.status).toBe(403)

    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)
    await adminClient.post('/api/admin/users/delete', { id: user.id })
  })

  it('bans an activated user and blocks login', async () => {
    const { payload, user } = await seedUser({ isActive: true })
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    const banned = await adminClient.post<UserItem>('/api/admin/users/ban', {
      id: user.id,
      isBanned: true,
    })
    expect(banned.code).toBe(0)
    expect(banned.data.isBanned).toBe(true)

    const loginResponse = await e2eFetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    })

    expect(loginResponse.status).toBe(403)

    await adminClient.post('/api/admin/users/delete', { id: user.id })
  })

  it('deletes a newly created user', async () => {
    const { user } = await seedUser({ isActive: false })
    const sessionCookie = await loginAsAdmin()
    const adminClient = createAdminClient(sessionCookie)

    const deleted = await adminClient.post<UserItem>('/api/admin/users/delete', {
      id: user.id,
    })
    expect(deleted.code).toBe(0)
    expect(deleted.data.id).toBe(user.id)

    const listAfterDelete = await adminClient.get<UserItem[]>('/api/admin/users/list')
    expect(listAfterDelete.code).toBe(0)
    expect(listAfterDelete.data.some(item => item.id === user.id)).toBe(false)
  })
})
