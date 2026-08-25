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
      status varchar(20) NOT NULL DEFAULT 'success',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  testContext.database = drizzle(client, { schema })
})

beforeEach(async () => {
  await client.exec(`
    TRUNCATE operation_logs, users RESTART IDENTITY;
    INSERT INTO users (username, role) VALUES ('owner', 'admin'), ('alice', 'user');
    INSERT INTO operation_logs (user_id, actor, action, resource_type, status, ip, created_at) VALUES
      (1, 'owner', 'auth.login.password', 'user', 'success', '10.0.0.1', '2026-01-01T00:00:00Z'),
      (1, 'owner', 'admin.user.update', 'user', 'success', '10.0.0.1', '2026-01-02T00:00:00Z'),
      (1, 'owner', 'admin.settings.update', 'site-settings', 'failure', '10.0.0.1', '2026-01-03T00:00:00Z'),
      (2, 'alice', 'user.profile.update', 'user', 'success', '10.0.0.2', '2026-01-04T00:00:00Z'),
      (2, 'alice', 'admin.access.denied', 'endpoint', 'failure', '10.0.0.2', '2026-01-05T00:00:00Z'),
      (99, 'ghost', 'admin.user.delete', 'user', 'success', '10.0.0.3', '2026-01-06T00:00:00Z'),
      (null, 'system', 'user.checkin', 'user', 'success', null, '2026-01-07T00:00:00Z');
  `)
})

afterAll(async () => client.close())

async function listActions(filters: Parameters<typeof operationLogService.list>[0] = {}) {
  const result = await operationLogService.list(filters)
  return { actions: result.items.map(item => item.action), total: result.total }
}

describe('operation log list', () => {
  it('excludes login events so they stay exclusive to the login log view', async () => {
    const { actions, total } = await listActions()
    expect(actions).not.toContain('auth.login.password')
    expect(total).toBe(6)
  })

  it('orders newest first', async () => {
    const { actions } = await listActions()
    expect(actions[0]).toBe('user.checkin')
  })

  it('resolves actorKind from the joined role, not the action prefix', async () => {
    // alice 是普通用户，她的越权尝试记的是 admin.* 动作码，但来源仍应归入「用户操作」。
    const asUser = await listActions({ actorKind: 'user' })
    expect(asUser.actions).toEqual(expect.arrayContaining(['admin.access.denied', 'user.profile.update']))

    const asAdmin = await listActions({ actorKind: 'admin' })
    expect(asAdmin.actions).not.toContain('admin.access.denied')
    expect(asAdmin.actions).toEqual(expect.arrayContaining(['admin.user.update', 'admin.settings.update']))
  })

  it('falls back to the action prefix when the actor account no longer exists', async () => {
    // userId 无外键：用户硬删后审计仍保留，此时只能靠动作码前缀归类。
    const asAdmin = await listActions({ actorKind: 'admin' })
    expect(asAdmin.actions).toContain('admin.user.delete')

    const asUser = await listActions({ actorKind: 'user' })
    expect(asUser.actions).toContain('user.checkin')
  })

  it('matches an action prefix rather than an exact code', async () => {
    const { actions } = await listActions({ action: 'admin.user.' })
    expect(actions.sort()).toEqual(['admin.user.delete', 'admin.user.update'])
  })

  it('filters by status, resource type and actor snapshot', async () => {
    expect((await listActions({ status: 'failure' })).actions.sort())
      .toEqual(['admin.access.denied', 'admin.settings.update'])
    expect((await listActions({ resourceType: 'endpoint' })).actions)
      .toEqual(['admin.access.denied'])
    expect((await listActions({ actor: 'alic' })).actions.sort())
      .toEqual(['admin.access.denied', 'user.profile.update'])
  })

  it('matches keyword across actor, action, resource and ip', async () => {
    expect((await listActions({ keyword: '10.0.0.2' })).actions.sort())
      .toEqual(['admin.access.denied', 'user.profile.update'])
    expect((await listActions({ keyword: 'settings' })).actions)
      .toEqual(['admin.settings.update'])
  })

  it('bounds results by the requested time range', async () => {
    const { actions } = await listActions({
      startAt: new Date('2026-01-04T00:00:00Z'),
      endAt: new Date('2026-01-05T00:00:00Z')
    })
    expect(actions.sort()).toEqual(['admin.access.denied', 'user.profile.update'])
  })
})
