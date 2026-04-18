import { and, desc, eq, gte, like, lte, type SQL } from 'drizzle-orm'
import { operationLogs } from '@nuxthub/db/schema'

export type OperationLogActorType = 'user' | 'admin' | 'system'
export type OperationLogStatus = 'success' | 'failure'

export interface OperationLogInput {
  userId?: number | null
  actor?: string | null
  actorType?: OperationLogActorType
  action: string
  resourceType?: string | null
  resourceId?: string | number | null
  ip?: string | null
  userAgent?: string | null
  /** 结构化对象优先；为兼容老代码也接受 JSON 字符串，会自动 parse。 */
  detail?: Record<string, unknown> | string | null
  status?: OperationLogStatus
  errorMessage?: string | null
}

function normalizeDetail(value: OperationLogInput['detail']): Record<string, unknown> | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
      return { value: parsed }
    }
    catch {
      return { raw: value }
    }
  }
  return value
}

export interface OperationLogListFilters {
  userId?: number
  actorType?: OperationLogActorType
  action?: string // 支持前缀匹配，如 "user." 匹配所有用户相关操作
  resourceType?: string
  status?: OperationLogStatus
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

export const operationLogService = {
  async addLog(input: OperationLogInput) {
    try {
      await db.insert(operationLogs).values({
        userId: input.userId ?? null,
        actor: input.actor?.slice(0, 140) ?? null,
        actorType: input.actorType || 'user',
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId !== null && input.resourceId !== undefined ? String(input.resourceId).slice(0, 120) : null,
        ip: input.ip ?? null,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        detail: normalizeDetail(input.detail),
        status: input.status || 'success',
        errorMessage: input.errorMessage?.slice(0, 500) ?? null,
      })
    }
    catch (error) {
      // 审计日志落库失败不应阻塞主业务流程，仅记录控制台。
      console.error('failed to write operation log', { input, error })
    }
  },

  async list(filters: OperationLogListFilters = {}) {
    const conditions: SQL[] = []
    if (typeof filters.userId === 'number') {
      conditions.push(eq(operationLogs.userId, filters.userId))
    }
    if (filters.actorType) {
      conditions.push(eq(operationLogs.actorType, filters.actorType))
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

    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0)

    const query = db.select().from(operationLogs)
    const rows = conditions.length
      ? await query.where(and(...conditions)).orderBy(desc(operationLogs.createdAt)).limit(limit).offset(offset)
      : await query.orderBy(desc(operationLogs.createdAt)).limit(limit).offset(offset)

    return rows
  },
}
