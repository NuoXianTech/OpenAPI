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

const { adminApiCallLogService } = await import('~~/server/services/admin-api-call-log-service')
const { loginLogService } = await import('~~/server/services/login-log-service')
const { operationLogService } = await import('~~/server/services/operation-log-service')
let client: PGlite

beforeAll(async () => {
  client = new PGlite()
  await client.exec(`
    CREATE TABLE users (
      id serial PRIMARY KEY,
      username varchar(50) NOT NULL,
      role varchar(20) NOT NULL
    );
    CREATE TABLE api_categories (
      id serial PRIMARY KEY,
      name varchar(100) NOT NULL,
      sort_order integer NOT NULL DEFAULT 0,
      deleted_at timestamptz
    );
    CREATE TABLE api_products (
      id uuid PRIMARY KEY,
      name varchar(160) NOT NULL,
      category_id integer
    );
    CREATE TABLE api_versions (
      id uuid PRIMARY KEY,
      product_id uuid NOT NULL
    );
    CREATE TABLE api_routes (
      id uuid PRIMARY KEY,
      api_version_id uuid NOT NULL,
      name varchar(160) NOT NULL,
      path_pattern varchar(1000) NOT NULL,
      deleted_at timestamptz
    );
    CREATE TABLE api_keys (
      id serial PRIMARY KEY,
      name varchar(100) NOT NULL
    );
    CREATE TABLE api_calls (
      id bigserial PRIMARY KEY,
      route_id uuid NOT NULL,
      api_key_id integer,
      api_key_name varchar(100),
      user_id integer,
      path varchar(1000) NOT NULL,
      method varchar(10) NOT NULL,
      status_code integer NOT NULL,
      is_counted boolean NOT NULL DEFAULT true,
      error_code varchar(50),
      error_message varchar(500),
      ip varchar(45),
      request_id uuid NOT NULL,
      created_at timestamptz NOT NULL
    );
    CREATE TABLE operation_logs (
      id bigserial PRIMARY KEY,
      user_id integer,
      actor varchar(140),
      action varchar(80) NOT NULL,
      resource_type varchar(80),
      resource_id varchar(120),
      ip varchar(45),
      user_agent varchar(500),
      detail jsonb,
      status varchar(20) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE api_calls, api_keys, api_routes, api_versions, api_products, api_categories, operation_logs, users RESTART IDENTITY;
    INSERT INTO users (username, role) VALUES ('owner', 'admin'), ('alice', 'user');
  `)
})

afterAll(async () => client.close())

describe('log cleanup services', () => {
  it('deletes only API calls matching joined filters and call type', async () => {
    await client.exec(`
      INSERT INTO api_categories (name) VALUES ('Tools'), ('Data');
      INSERT INTO api_products (id, name, category_id) VALUES
        ('00000000-0000-4000-8000-000000000001', 'Tool API', 1),
        ('00000000-0000-4000-8000-000000000002', 'Data API', 2);
      INSERT INTO api_versions (id, product_id) VALUES
        ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001'),
        ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000002');
      INSERT INTO api_routes (id, api_version_id, name, path_pattern) VALUES
        ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000011', 'Tool API', '/v1/tool'),
        ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000012', 'Data API', '/v1/data');
      INSERT INTO api_keys (name) VALUES ('Production');
      INSERT INTO api_calls (route_id, api_key_id, user_id, path, method, status_code, is_counted, error_code, request_id, created_at) VALUES
        ('00000000-0000-4000-8000-000000000021', 1, 2, '/v1/tool', 'GET', 200, true, null, '00000000-0000-4000-8000-000000000031', '2026-01-01T00:00:00Z'),
        ('00000000-0000-4000-8000-000000000021', 1, 2, '/v1/tool', 'GET', 500, true, 'UPSTREAM', '00000000-0000-4000-8000-000000000032', '2026-01-01T01:00:00Z'),
        ('00000000-0000-4000-8000-000000000022', 1, 2, '/v1/data', 'GET', 500, true, 'UPSTREAM', '00000000-0000-4000-8000-000000000033', '2026-01-01T02:00:00Z');
    `)

    await expect(adminApiCallLogService.deleteMatching({
      categoryId: 1,
      types: ['error']
    })).resolves.toBe(1)

    const remaining = await client.query<{ id: number }>('SELECT id FROM api_calls ORDER BY id')
    expect(remaining.rows.map(row => row.id)).toEqual([1, 3])
  })

  it('deletes matching login events without touching operation logs', async () => {
    await client.exec(`
      INSERT INTO operation_logs (user_id, actor, action, status, detail) VALUES
        (1, 'owner', 'auth.login.password', 'success', '{"method":"password"}'),
        (2, 'alice', 'auth.login.oauth_github', 'failure', '{"method":"oauth_github","failureReason":"banned"}'),
        (1, 'owner', 'auth.login.oauth_qq', 'failure', '{"method":"oauth_qq","failureReason":"banned"}'),
        (1, 'owner', 'admin.user.update', 'success', '{}');
    `)

    await expect(loginLogService.deleteMatching({ keyword: 'alice' })).resolves.toBe(1)
    await expect(loginLogService.deleteMatching({ success: false })).resolves.toBe(1)

    const remaining = await client.query<{ action: string }>('SELECT action FROM operation_logs ORDER BY id')
    expect(remaining.rows.map(row => row.action)).toEqual([
      'auth.login.password',
      'admin.user.update'
    ])
  })

  it('deletes matching operations without touching login events', async () => {
    await client.exec(`
      INSERT INTO operation_logs (user_id, actor, action, status, detail) VALUES
        (1, 'owner', 'auth.login.password', 'success', '{"method":"password"}'),
        (1, 'owner', 'admin.user.update', 'success', '{}'),
        (2, 'alice', 'user.profile.update', 'success', '{}'),
        (null, 'system', 'system.cleanup', 'success', '{}');
    `)

    await expect(operationLogService.deleteMatching({ actorKind: 'user' })).resolves.toBe(1)

    const remaining = await client.query<{ action: string }>('SELECT action FROM operation_logs ORDER BY id')
    expect(remaining.rows.map(row => row.action)).toEqual([
      'auth.login.password',
      'admin.user.update',
      'system.cleanup'
    ])
  })
})
