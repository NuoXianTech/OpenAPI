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

vi.mock('~~/server/utils/shared-cache', () => ({
  deleteSharedCache: vi.fn(async () => {}),
  getSharedCache: vi.fn()
}))

const { apiCategoryService } = await import('~~/server/services/api-category-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE api_categories (
      id serial PRIMARY KEY,
      code varchar(50) NOT NULL UNIQUE,
      name varchar(100) NOT NULL,
      description text,
      icon varchar(120),
      color varchar(20),
      parent_id integer REFERENCES api_categories(id) ON DELETE SET NULL,
      sort_order integer NOT NULL DEFAULT 0,
      is_enabled boolean NOT NULL DEFAULT true,
      deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec('TRUNCATE api_categories RESTART IDENTITY CASCADE;')
})

afterAll(async () => client.close())

describe('api category service', () => {
  it('maps a concurrent duplicate code insert to conflict', async () => {
    await apiCategoryService.create({ code: 'tools', name: 'Tools' })

    await expect(apiCategoryService.create({ code: 'tools', name: 'Duplicate' }))
      .rejects.toMatchObject({ statusCode: 409 })
  })
})
