import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '~~/server/db/schema'

/**
 * 审计写入内核测试。
 *
 * 落库成功的字段裁剪走真实 PGlite；失败重试与降级路径通过在 db 代理上注入
 * 可控的 insert 失败次数来驱动，因此不需要真的把数据库打挂。
 *
 * 登录事件与操作事件共用这一个内核，因此两侧的门面都在这里一起验证——
 * 这正是统一入口要守住的不变式：任何一侧都不能拥有自己的截断或降级策略。
 */
const testContext = vi.hoisted(() => ({
  database: null as unknown,
  failInsertsRemaining: 0
}))

vi.mock('~~/server/db/client', () => ({
  get db() {
    const database = testContext.database as Record<string, unknown>
    return new Proxy(database, {
      get(target, property, receiver) {
        if (property === 'insert' && testContext.failInsertsRemaining > 0) {
          testContext.failInsertsRemaining -= 1
          return () => ({
            values: () => Promise.reject(new Error('insert failed'))
          })
        }
        return Reflect.get(target, property, receiver)
      }
    })
  }
}))

const { recordAuditLog } = await import('~~/server/services/audit-log-writer')
const { loginLogService } = await import('~~/server/services/login-log-service')

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
  testContext.failInsertsRemaining = 0
  await client.exec(`
    TRUNCATE operation_logs, users RESTART IDENTITY;
    INSERT INTO users (username, role) VALUES ('owner', 'admin'), ('alice', 'user');
  `)
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => client.close())

async function readLogs() {
  const result = await client.query<{
    action: string
    actor: string | null
    resource_id: string | null
    user_agent: string | null
    status: string
  }>('SELECT action, actor, resource_id, user_agent, status FROM operation_logs ORDER BY id')
  return result.rows
}

describe('operation log write path', () => {
  it('persists an entry and defaults status to success', async () => {
    await recordAuditLog({
      userId: 1,
      actor: 'owner',
      action: 'admin.user.update',
      resourceType: 'user',
      resourceId: 2
    })

    expect(await readLogs()).toEqual([
      expect.objectContaining({ action: 'admin.user.update', actor: 'owner', resource_id: '2', status: 'success' })
    ])
  })

  it('truncates oversized snapshots to fit the column widths', async () => {
    await recordAuditLog({
      userId: 1,
      actor: 'a'.repeat(200),
      action: 'admin.user.update',
      resourceId: 'r'.repeat(200),
      userAgent: 'u'.repeat(900)
    })

    const [row] = await readLogs()
    expect(row!.actor).toHaveLength(140)
    expect(row!.resource_id).toHaveLength(120)
    expect(row!.user_agent).toHaveLength(500)
  })

  it('retries once and still persists when the first insert fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    testContext.failInsertsRemaining = 1

    await recordAuditLog({
      userId: 1,
      actor: 'owner',
      action: 'admin.settings.update'
    })

    expect(await readLogs()).toEqual([
      expect.objectContaining({ action: 'admin.settings.update' })
    ])
    expect(consoleError).toHaveBeenCalledWith(
      'failed to write audit log, retrying once',
      expect.objectContaining({ action: 'admin.settings.update' })
    )
  })

  it('falls back to a greppable stderr record when a durable write cannot land', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    testContext.failInsertsRemaining = 2

    // durable 级：业务变更已落库，抛错只会把成功的操作报成失败，因此不中止请求。
    await expect(recordAuditLog({
      userId: 1,
      actor: 'owner',
      action: 'admin.operation-log.cleanup',
      detail: { affected: 12 }
    })).resolves.toBeUndefined()

    expect(await readLogs()).toEqual([])

    const fallback = consoleError.mock.calls
      .map(call => String(call[0]))
      .find(message => message.startsWith('AUDIT_FALLBACK '))
    expect(fallback).toBeDefined()

    const payload = JSON.parse(fallback!.slice('AUDIT_FALLBACK '.length))
    expect(payload).toMatchObject({
      marker: 'AUDIT_FALLBACK',
      reason: 'insert failed',
      log: {
        action: 'admin.operation-log.cleanup',
        actor: 'owner',
        userId: 1,
        detail: { affected: 12 }
      }
    })
  })

  it('throws for a gate action so a secret is never disclosed without a trace', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    testContext.failInsertsRemaining = 1

    await expect(recordAuditLog({
      userId: 2,
      actor: 'alice',
      action: 'user.api-key.reveal',
      resourceId: 7
    })).rejects.toThrow('insert failed')

    // 抛错之前仍然留下降级记录，避免这次披露尝试彻底无痕。
    expect(consoleError.mock.calls.map(call => String(call[0])).some(
      message => message.startsWith('AUDIT_FALLBACK ')
    )).toBe(true)
  })

  it('does not retry a gate action, so one disclosure never lands twice', async () => {
    // 重试不是幂等的：若首次 INSERT 已提交、只是响应丢失，重试会写第二条。
    // 两条 reveal 记录会让排查者认为密钥被查看了两次——在最需要准确的记录上造假信号。
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    testContext.failInsertsRemaining = 1

    await expect(recordAuditLog({
      userId: 2,
      actor: 'alice',
      action: 'user.api-key.reveal',
      resourceId: 7
    })).rejects.toThrow('insert failed')

    // 只尝试过一次，没有出现「重试中」的日志。
    expect(consoleError.mock.calls.map(call => String(call[0])).some(
      message => message.includes('retrying once')
    )).toBe(false)
    expect(await readLogs()).toEqual([])
  })
})

describe('login events share the same write core', () => {
  it('records a login attempt with the detail shape the query side depends on', async () => {
    await loginLogService.record({
      userId: 2,
      username: 'alice',
      method: 'oauth_github',
      success: false,
      failureReason: 'banned',
      ip: '10.0.0.2',
      userAgent: 'agent'
    })

    const rows = await client.query<{ action: string, status: string, detail: Record<string, unknown> }>(
      'SELECT action, status, detail FROM operation_logs ORDER BY id'
    )
    expect(rows.rows).toEqual([
      expect.objectContaining({
        action: 'auth.login.oauth_github',
        status: 'failure',
        // detail.method 是 loginLogSelection 与 buildConditions 的依赖字段。
        detail: { method: 'oauth_github', failureReason: 'banned' }
      })
    ])
  })

  it('retries a login write instead of dropping it on a transient failure', async () => {
    // 统一入口之前，登录写入是 try/catch + console，首次失败即丢。
    vi.spyOn(console, 'error').mockImplementation(() => {})
    testContext.failInsertsRemaining = 1

    await loginLogService.record({
      userId: 1,
      username: 'owner',
      method: 'password',
      success: true
    })

    expect(await readLogs()).toEqual([
      expect.objectContaining({ action: 'auth.login.password', status: 'success' })
    ])
  })

  it('falls back to stderr rather than losing a login event entirely', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    testContext.failInsertsRemaining = 2

    // 登录事件是 durable：不阻塞登录流程，但必须留下进程外可恢复的痕迹。
    await expect(loginLogService.record({
      userId: 1,
      username: 'owner',
      method: 'password',
      success: true
    })).resolves.toBeUndefined()

    const fallback = consoleError.mock.calls
      .map(call => String(call[0]))
      .find(message => message.startsWith('AUDIT_FALLBACK '))
    expect(fallback).toBeDefined()
    expect(JSON.parse(fallback!.slice('AUDIT_FALLBACK '.length))).toMatchObject({
      log: { action: 'auth.login.password', actor: 'owner', status: 'success' }
    })
  })

  it('truncates a login actor snapshot with the same rule as operation events', async () => {
    await loginLogService.record({
      userId: 1,
      username: 'o'.repeat(200),
      method: 'password',
      success: true,
      userAgent: 'u'.repeat(900)
    })

    const [row] = await readLogs()
    expect(row!.actor).toHaveLength(140)
    expect(row!.user_agent).toHaveLength(500)
  })
})
