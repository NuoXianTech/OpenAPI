import { and, count, desc, eq, gte, ilike, isNotNull, like, lte, or, sql, type SQL } from 'drizzle-orm'
import { LOGIN_ACTION_PREFIX } from '#shared/config/audit-actions'
import { db } from '~~/server/db/client'
import { operationLogs, users } from '~~/server/db/schema'
import { recordAuditLog } from '~~/server/services/audit-log-writer'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type { LoginFailureReason, LoginMethod } from '#shared/types/login-log'

interface LoginLogRecord {
  id: number
  userId: number
  username: string
  method: string
  success: boolean
  failureReason: string | null
  ip: string | null
  userAgent: string | null
  createdAt: Date
}

interface AdminLoginLogRecord extends LoginLogRecord {
  role: 'user' | 'admin'
}

interface RecordLoginInput {
  userId: number
  username: string
  method: LoginMethod
  success: boolean
  failureReason?: LoginFailureReason | null
  ip?: string | null
  userAgent?: string | null
}

export interface LoginLogFilters {
  keyword?: string
  userId?: number
  method?: LoginMethod
  success?: boolean
  startAt?: Date
  endAt?: Date
}

interface ListLoginLogsInput extends LoginLogFilters {
  limit?: number
  offset?: number
}

function buildConditions(filters: LoginLogFilters): SQL[] {
  const conditions: SQL[] = [
    like(operationLogs.action, `${LOGIN_ACTION_PREFIX}%`),
    isNotNull(operationLogs.userId)
  ]
  const keyword = filters.keyword?.trim()
  if (keyword) {
    const keywordPattern = `%${keyword}%`
    conditions.push(or(
      ilike(operationLogs.actor, keywordPattern),
      ilike(operationLogs.action, keywordPattern),
      ilike(operationLogs.ip, keywordPattern),
      ilike(operationLogs.userAgent, keywordPattern),
      sql`${operationLogs.detail}->>'method' ilike ${keywordPattern}`,
      sql`${operationLogs.detail}->>'failureReason' ilike ${keywordPattern}`,
      sql`${operationLogs.userId}::text ilike ${keywordPattern}`
    )!)
  }
  if (typeof filters.userId === 'number') conditions.push(eq(operationLogs.userId, filters.userId))
  if (filters.method) conditions.push(eq(operationLogs.action, `${LOGIN_ACTION_PREFIX}${filters.method}`))
  if (typeof filters.success === 'boolean') {
    conditions.push(eq(operationLogs.status, filters.success ? 'success' : 'failure'))
  }
  if (filters.startAt) conditions.push(gte(operationLogs.createdAt, filters.startAt))
  if (filters.endAt) conditions.push(lte(operationLogs.createdAt, filters.endAt))
  return conditions
}

function loginLogSelection() {
  return {
    id: operationLogs.id,
    userId: sql<number>`${operationLogs.userId}`,
    username: sql<string>`coalesce(${operationLogs.actor}, '')`,
    method: sql<string>`${operationLogs.detail}->>'method'`,
    success: sql<boolean>`${operationLogs.status} = 'success'`,
    failureReason: sql<string | null>`${operationLogs.detail}->>'failureReason'`,
    ip: operationLogs.ip,
    userAgent: operationLogs.userAgent,
    createdAt: operationLogs.createdAt
  }
}

export const loginLogService = {
  /**
   * 记录一次登录尝试。
   *
   * 走统一写入内核，因此与操作事件共享同一套截断、重试与降级保证。
   * `detail.method` 是查询侧（loginLogSelection / buildConditions）的依赖字段，
   * 由这个门面负责填充，调用方无法漏写。
   */
  async record(input: RecordLoginInput) {
    await recordAuditLog({
      userId: input.userId,
      actor: input.username,
      action: `${LOGIN_ACTION_PREFIX}${input.method}`,
      resourceType: 'user',
      resourceId: input.userId,
      ip: input.ip,
      userAgent: input.userAgent,
      detail: {
        method: input.method,
        failureReason: input.failureReason ?? null
      },
      status: input.success ? 'success' : 'failure'
    })
  },

  async list(filters: ListLoginLogsInput = {}): Promise<{ items: LoginLogRecord[], total: number }> {
    const where = and(...buildConditions(filters))
    const { limit, offset } = normalizePagination(filters)

    const [items, totalRows] = await Promise.all([
      db.select(loginLogSelection())
        .from(operationLogs)
        .where(where)
        .orderBy(desc(operationLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(operationLogs).where(where)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  async listForAdmin(filters: ListLoginLogsInput = {}): Promise<{ items: AdminLoginLogRecord[], total: number }> {
    const where = and(...buildConditions(filters))
    const { limit, offset } = normalizePagination(filters)

    const [items, totalRows] = await Promise.all([
      db.select({
        ...loginLogSelection(),
        role: users.role
      })
        .from(operationLogs)
        .innerJoin(users, eq(users.id, operationLogs.userId))
        .where(where)
        .orderBy(desc(operationLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() })
        .from(operationLogs)
        .innerJoin(users, eq(users.id, operationLogs.userId))
        .where(where)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  async deleteMatching(filters: LoginLogFilters): Promise<number> {
    const deletedLogs = db.$with('deleted_login_logs').as(
      db.delete(operationLogs)
        .where(and(...buildConditions(filters)))
        .returning({ id: operationLogs.id })
    )
    const rows = await db.with(deletedLogs)
      .select({ value: count() })
      .from(deletedLogs)
    return toNumber(rows[0]?.value)
  }
}
