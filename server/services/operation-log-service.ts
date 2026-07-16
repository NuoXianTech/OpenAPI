import type { H3Event } from 'h3'
import { and, count, desc, eq, getTableColumns, gte, ilike, isNull, like, lte, or, type SQL } from 'drizzle-orm'
import { operationLogs, users } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { readRequestMeta } from '~~/server/utils/request-meta'

export type OperationLogStatus = 'success' | 'failure'

interface OperationLogInput {
  userId?: number | null
  actor?: string | null
  action: string
  resourceType?: string | null
  resourceId?: string | number | null
  ip?: string | null
  userAgent?: string | null
  detail?: Record<string, unknown> | null
  status?: OperationLogStatus
}

interface OperationLogListFilters {
  userId?: number
  // 管理员也是真实 users 账号，来源按 action 前缀区分，而不是按 userId 是否为空区分。
  actorKind?: 'admin' | 'user'
  /** 模糊匹配操作者名快照（actor 字段） */
  actor?: string
  action?: string // 支持前缀匹配，如 "user." 匹配所有用户相关操作
  resourceType?: string
  status?: OperationLogStatus
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

interface OperationLogListResult {
  items: Array<typeof operationLogs.$inferSelect & { actorRole: 'user' | 'admin' | null }>
  total: number
}

export const operationLogService = {
  async addLog(input: OperationLogInput) {
    try {
      await db.insert(operationLogs).values({
        userId: input.userId ?? null,
        actor: input.actor?.slice(0, 140) ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId !== null && input.resourceId !== undefined ? String(input.resourceId).slice(0, 120) : null,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        detail: input.detail ?? null,
        status: input.status || 'success'
      })
    } catch (error) {
      // 审计日志落库失败不应阻塞主业务流程，仅记录控制台。
      console.error('failed to write operation log', { input, error })
    }
  },

  async addRequestLog(event: H3Event, input: OperationLogInput) {
    const requestMeta = readRequestMeta(event)
    await operationLogService.addLog({
      ...input,
      ip: input.ip ?? requestMeta.ip,
      userAgent: input.userAgent ?? requestMeta.userAgent
    })
  },

  async list(filters: OperationLogListFilters = {}): Promise<OperationLogListResult> {
    const conditions: SQL[] = []
    if (typeof filters.userId === 'number') {
      conditions.push(eq(operationLogs.userId, filters.userId))
    }
    if (filters.actorKind === 'admin') {
      conditions.push(or(
        eq(users.role, 'admin'),
        and(isNull(users.id), like(operationLogs.action, 'admin.%'))
      )!)
    } else if (filters.actorKind === 'user') {
      conditions.push(or(
        eq(users.role, 'user'),
        and(isNull(users.id), like(operationLogs.action, 'user.%'))
      )!)
    }
    if (filters.actor) {
      conditions.push(ilike(operationLogs.actor, `%${filters.actor}%`))
    }
    if (filters.action) {
      conditions.push(like(operationLogs.action, `${filters.action}%`))
    }
    if (filters.resourceType) {
      conditions.push(eq(operationLogs.resourceType, filters.resourceType))
    }
    if (filters.status) {
      conditions.push(eq(operationLogs.status, filters.status))
    }
    if (filters.startAt) {
      conditions.push(gte(operationLogs.createdAt, filters.startAt))
    }
    if (filters.endAt) {
      conditions.push(lte(operationLogs.createdAt, filters.endAt))
    }

    const { limit, offset } = normalizePagination(filters)
    const where = conditions.length ? and(...conditions) : undefined

    const operationLogColumns = getTableColumns(operationLogs)
    const baseQuery = db.select({
      ...operationLogColumns,
      actorRole: users.role
    })
      .from(operationLogs)
      .leftJoin(users, eq(users.id, operationLogs.userId))
    const countQuery = db.select({ value: count() })
      .from(operationLogs)
      .leftJoin(users, eq(users.id, operationLogs.userId))

    const [items, totalRows] = await Promise.all([
      (where ? baseQuery.where(where) : baseQuery)
        .orderBy(desc(operationLogs.createdAt))
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  }
}
