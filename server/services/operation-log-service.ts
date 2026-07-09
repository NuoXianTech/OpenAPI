import { and, count, desc, eq, gte, ilike, like, lte, type SQL } from 'drizzle-orm'
import { operationLogs } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'

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
  items: Array<typeof operationLogs.$inferSelect>
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

  async list(filters: OperationLogListFilters = {}): Promise<OperationLogListResult> {
    const conditions: SQL[] = []
    if (typeof filters.userId === 'number') {
      conditions.push(eq(operationLogs.userId, filters.userId))
    }
    if (filters.actorKind === 'admin') {
      conditions.push(like(operationLogs.action, 'admin.%'))
    } else if (filters.actorKind === 'user') {
      conditions.push(like(operationLogs.action, 'user.%'))
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

    const baseQuery = db.select().from(operationLogs)
    const countQuery = db.select({ value: count() }).from(operationLogs)

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
