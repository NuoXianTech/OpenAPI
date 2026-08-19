import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

vi.mock('~~/server/utils/stored-secret', () => ({
  createStoredSecretPreview: (value: string) => value.slice(0, 12),
  decryptStoredSecret: (value: string) => value.replace(/^encrypted:/, ''),
  digestStoredSecret: (value: string) => value,
  encryptStoredSecret: (value: string) => `encrypted:${value}`,
  getApiKeySecret: () => Buffer.alloc(32, 1)
}))

const { apiKeyService } = await import('~~/server/services/api-key-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (id serial PRIMARY KEY);
    CREATE TABLE api_keys (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name varchar(80) NOT NULL,
      key_digest varchar(64) NOT NULL UNIQUE,
      key_ciphertext text NOT NULL,
      key_preview varchar(32) NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      scopes jsonb,
      ip_whitelist jsonb,
      total_quota integer,
      used_credits integer NOT NULL DEFAULT 0,
      total_calls integer NOT NULL DEFAULT 0,
      last_used_at timestamptz,
      last_used_ip varchar(45),
      expires_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE api_keys, users RESTART IDENTITY CASCADE;
    INSERT INTO users DEFAULT VALUES;
  `)
})

afterAll(async () => client.close())

describe('api key service', () => {
  it('keeps generated batch names within the database limit', async () => {
    const created = await apiKeyService.createForUser(1, {
      name: '密'.repeat(100),
      count: 2
    })

    expect(Array.from(created[0]!.name)).toHaveLength(80)
    expect(Array.from(created[1]!.name)).toHaveLength(80)
    expect(created[1]!.name).toMatch(/-[a-f0-9]{6}$/)
  })

  it('falls back to one key for a non-finite count', async () => {
    const created = await apiKeyService.createForUser(1, {
      count: Number.NaN
    })

    expect(created).toHaveLength(1)
  })

  it('reveals a full key only through owner-authorized operations', async () => {
    const [created] = await apiKeyService.createForUser(1, { name: 'Production' })
    expect(created?.apiKey).toMatch(/^op_/)

    const [listed] = await apiKeyService.listByUser(1)
    expect(listed?.keyPreview).toBe(created?.keyPreview)
    expect(listed).not.toHaveProperty('apiKey')
    expect(listed).not.toHaveProperty('keyCiphertext')
    expect(listed).not.toHaveProperty('keyDigest')

    const revealed = await apiKeyService.revealForUser(1, created!.id)
    expect(revealed?.apiKey).toBe(created?.apiKey)
    expect(await apiKeyService.revealForUser(2, created!.id)).toBeNull()

    const updated = await apiKeyService.updateConfig(created!.id, { name: 'Renamed' })
    expect(updated).not.toHaveProperty('apiKey')

    const reset = await apiKeyService.resetForUser(1, created!.id)
    expect(reset?.apiKey).toMatch(/^op_/)
    expect(reset?.apiKey).not.toBe(created?.apiKey)
  })
})
