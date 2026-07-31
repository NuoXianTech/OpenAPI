import { and, count, desc, eq, gte, isNotNull, like, lte, sql, type SQL } from 'drizzle-orm'
import { operationLogs, users } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type { LoginFailureReason, LoginMethod } from '#shared/types/login-log'

const LOGIN_ACTION_PREFIX = 'auth.login.'

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

interface ListFilters {
  userId?: number
  method?: LoginMethod
  success?: boolean
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

function buildConditions(filters: ListFilters): SQL[] {
  const conditions: SQL[] = [
    like(operationLogs.action, `${LOGIN_ACTION_PREFIX}%`),
    isNotNull(operationLogs.userId)
  ]
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
  /** 登录日志写入统一审计表；失败不阻塞登录流程。 */
  async record(input: RecordLoginInput) {
    try {
      await db.insert(operationLogs).values({
        userId: input.userId,
        actor: input.username.slice(0, 140),
        action: `${LOGIN_ACTION_PREFIX}${input.method}`,
        resourceType: 'user',
        resourceId: String(input.userId),
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        detail: {
          method: input.method,
          failureReason: input.failureReason ?? null
        },
        status: input.success ? 'success' : 'failure'
      })
    } catch (err) {
      console.error('failed to write login log', { input, err })
    }
  },

  async list(filters: ListFilters = {}): Promise<{ items: LoginLogRecord[], total: number }> {
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

  async listForAdmin(filters: ListFilters = {}): Promise<{ items: AdminLoginLogRecord[], total: number }> {
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
  }
}
