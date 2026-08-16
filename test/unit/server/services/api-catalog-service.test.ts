import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { API_STATUS } from '#shared/config/api-status'
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
    CREATE TABLE api_products (
      id uuid PRIMARY KEY,
      slug varchar(80) NOT NULL,
      name varchar(160) NOT NULL,
      summary varchar(300) NOT NULL DEFAULT '',
      description text NOT NULL DEFAULT '',
      category_id integer,
      visibility varchar(20) NOT NULL,
      lifecycle varchar(20) NOT NULL,
      deleted_at timestamptz
    );
    CREATE TABLE api_versions (
      id uuid PRIMARY KEY,
      product_id uuid NOT NULL,
      state varchar(20) NOT NULL
    );
    CREATE TABLE upstream_services (
      id uuid PRIMARY KEY,
      status varchar(20) NOT NULL,
      deleted_at timestamptz
    );
    CREATE TABLE api_routes (
      id uuid PRIMARY KEY,
      api_version_id uuid NOT NULL,
      upstream_service_id uuid NOT NULL,
      name varchar(160) NOT NULL,
      method varchar(10) NOT NULL,
      path_pattern varchar(1000) NOT NULL,
      is_api_key boolean NOT NULL DEFAULT false,
      is_statistics boolean NOT NULL DEFAULT false,
      credits_cost integer NOT NULL DEFAULT 0,
      state varchar(20) NOT NULL,
      deleted_at timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE api_call_stats (
      route_id uuid NOT NULL,
      stat_date date NOT NULL,
      total_count integer NOT NULL DEFAULT 0,
      success_count integer NOT NULL DEFAULT 0,
      failure_count integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (route_id, stat_date)
    );
    CREATE TABLE api_calls (
      id bigserial PRIMARY KEY,
      route_id uuid NOT NULL,
      status_code integer NOT NULL,
      is_counted boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE routing_revisions (
      id uuid PRIMARY KEY,
      status varchar(20) NOT NULL,
      config_payload jsonb NOT NULL
    );
    CREATE TABLE environments (
      id uuid PRIMARY KEY,
      active_revision_id uuid,
      status varchar(20) NOT NULL
    );
    INSERT INTO api_products
      (id, slug, name, summary, description, visibility, lifecycle, deleted_at)
    VALUES
      ('00000000-0000-4000-8000-000000000001', 'enabled', 'Enabled', 'enabled', 'enabled', 'public', 'active', null),
      ('00000000-0000-4000-8000-000000000002', 'disabled', 'Disabled', 'disabled', 'disabled', 'public', 'active', null),
      ('00000000-0000-4000-8000-000000000003', 'private', 'Private', 'private', 'private', 'private', 'active', null),
      ('00000000-0000-4000-8000-000000000004', 'unpublished', 'Unpublished', 'unpublished', 'unpublished', 'public', 'active', null),
      ('00000000-0000-4000-8000-000000000005', 'unknown', 'Unknown', 'unknown', 'unknown', 'public', 'active', null),
      ('00000000-0000-4000-8000-000000000006', 'abnormal', 'Abnormal', 'abnormal', 'abnormal', 'public', 'active', null);
    INSERT INTO api_versions (id, product_id, state) VALUES
      ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'published'),
      ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002', 'published'),
      ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000003', 'published'),
      ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000004', 'published'),
      ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000005', 'published'),
      ('00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000006', 'published');
    INSERT INTO upstream_services (id, status) VALUES
      ('00000000-0000-4000-8000-000000000021', 'active');
    INSERT INTO api_routes
      (id, api_version_id, upstream_service_id, name, method, path_pattern, is_statistics, state)
    VALUES
      ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', 'Enabled', 'GET', '/v1/enabled', true, 'active'),
      ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000021', 'Disabled', 'GET', '/v1/disabled', true, 'disabled'),
      ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000021', 'Private', 'GET', '/v1/private', true, 'active'),
      ('00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000021', 'Unpublished', 'GET', '/v1/unpublished', true, 'active'),
      ('00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000021', 'Unknown', 'GET', '/v1/unknown', true, 'active'),
      ('00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000021', 'Abnormal', 'GET', '/v1/abnormal', true, 'active');
    INSERT INTO routing_revisions (id, status, config_payload) VALUES (
      '00000000-0000-4000-8000-000000000041',
      'published',
      '{"routes":[
        {"id":"00000000-0000-4000-8000-000000000031"},
        {"id":"00000000-0000-4000-8000-000000000033"},
        {"id":"00000000-0000-4000-8000-000000000035"},
        {"id":"00000000-0000-4000-8000-000000000036"}
      ]}'::jsonb
    );
    INSERT INTO environments (id, active_revision_id, status) VALUES
      ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000041', 'active');
    INSERT INTO api_calls (route_id, status_code, is_counted) VALUES
      ('00000000-0000-4000-8000-000000000031', 200, true),
      ('00000000-0000-4000-8000-000000000031', 404, true),
      ('00000000-0000-4000-8000-000000000031', 500, false),
      ('00000000-0000-4000-8000-000000000036', 500, true),
      ('00000000-0000-4000-8000-000000000036', 502, true);
  `)
  testContext.database = drizzle(client, { schema })
})

afterAll(async () => client.close())

describe('public API catalog', () => {
  it('only exposes public routes from the active routing revision', async () => {
    const items = await apiCatalogService.listPublicApis()
    const statuses = Object.fromEntries(items.map(item => [item.name, item.status]))

    expect(items.map(item => item.name).sort()).toEqual([
      'Abnormal',
      'Enabled',
      'Unknown'
    ])
    expect(statuses).toEqual({
      Abnormal: API_STATUS.abnormal,
      Enabled: API_STATUS.normal,
      Unknown: API_STATUS.unknown
    })
  })

  it('filters the live catalog by its resolved status', async () => {
    const items = await apiCatalogService.listPublicApis({
      status: API_STATUS.normal
    })

    expect(items.map(item => item.name)).toEqual(['Enabled'])
  })
})
