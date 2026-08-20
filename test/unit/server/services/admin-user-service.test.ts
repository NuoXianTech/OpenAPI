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

const { adminUserService } = await import('~~/server/services/admin-user-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      role varchar(20) NOT NULL DEFAULT 'user',
      username varchar(50) NOT NULL,
      display_name varchar(100),
      email varchar(255) NOT NULL,
      credits integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      is_banned boolean NOT NULL DEFAULT false,
      banned_reason varchar(500),
      banned_until timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE users RESTART IDENTITY;
    INSERT INTO users (username, email, credits, created_at) VALUES
      ('zero', 'zero@example.com', 0, '2026-01-01T00:00:00Z'),
      ('five', 'five@example.com', 5, '2026-01-02T00:00:00Z'),
      ('ten', 'ten@example.com', 10, '2026-01-03T00:00:00Z');
  `)
})

afterAll(async () => client.close())

describe('admin user service', () => {
  it('filters users with a positive credit balance', async () => {
    const result = await adminUserService.list({ creditBalance: 'positive' })

    expect(result.total).toBe(2)
    expect(result.items.map(item => item.username)).toEqual(['ten', 'five'])
  })

  it('filters users with a zero credit balance', async () => {
    const result = await adminUserService.list({ creditBalance: 'zero' })

    expect(result.total).toBe(1)
    expect(result.items.map(item => item.username)).toEqual(['zero'])
  })
})
