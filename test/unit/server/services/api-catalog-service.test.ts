import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

const testContext = vi.hoisted(() => ({ database: null as unknown }))

vi.mock('~~/server/db/client', () => ({
  get db() {
    return testContext.database
  }
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  getSharedCache: <T>(options: { loader: () => Promise<T> }) => options.loader(),
  getSharedCacheVersion: async () => 0,
  incrementSharedCacheVersion: async () => 1
}))

const { apiCatalogService } = await import('~~/server/services/api-catalog-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE apis (
      id serial PRIMARY KEY,
      code varchar(50) NOT NULL,
      path_version varchar(8) NOT NULL DEFAULT 'v1',
      endpoint_count integer NOT NULL DEFAULT 0,
      name varchar(100) NOT NULL,
      status integer NOT NULL DEFAULT 1,
      category_id integer,
      short_desc varchar(50) NOT NULL,
      description text NOT NULL,
      http_method varchar(50) NOT NULL,
      api_path varchar(200) NOT NULL,
      doc_url varchar(200) NOT NULL,
      is_enabled boolean NOT NULL DEFAULT false,
      is_api_key boolean NOT NULL DEFAULT false,
      is_statistics boolean NOT NULL DEFAULT false,
      is_orphaned boolean NOT NULL DEFAULT false,
      rate_limit_per_second integer NOT NULL DEFAULT 0,
      rate_limit_per_minute integer NOT NULL DEFAULT 0,
      rate_limit_per_hour integer NOT NULL DEFAULT 0,
      rate_limit_per_day integer NOT NULL DEFAULT 0,
      method_costs jsonb NOT NULL DEFAULT '{}',
      capability_config jsonb NOT NULL DEFAULT '{}',
      capability_revision integer NOT NULL DEFAULT 0,
      capability_updated_at timestamptz,
      daily_quota integer NOT NULL DEFAULT 0,
      timeout_ms integer NOT NULL DEFAULT 10000,
      created_by integer,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_by integer,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE api_call_stats (
      api_id integer NOT NULL,
      stat_date varchar(10) NOT NULL,
      total_count integer NOT NULL DEFAULT 0,
      success_count integer NOT NULL DEFAULT 0,
      failure_count integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (api_id, stat_date)
    );
    INSERT INTO apis
      (code, name, short_desc, description, http_method, api_path, doc_url, is_enabled, is_orphaned)
    VALUES
      ('enabled', 'Enabled', 'enabled', 'enabled', 'GET', '/v1/enabled', '', true, false),
      ('disabled', 'Disabled', 'disabled', 'disabled', 'GET', '/v1/disabled', '', false, false),
      ('orphaned', 'Orphaned', 'orphaned', 'orphaned', 'GET', '/v1/orphaned', '', true, true);
  `)
  testContext.database = drizzle(client, { schema })
})

afterAll(async () => client.close())

describe('public API catalog', () => {
  it('never exposes disabled or orphaned APIs', async () => {
    const items = await apiCatalogService.listPublicApis()

    expect(items.map(item => item.name)).toEqual(['Enabled'])
  })
})
