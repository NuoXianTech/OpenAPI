import { and, count, desc, eq, getTableColumns, gte, ilike, inArray, isNull, like, lte, notLike, or, sql, type SQL } from 'drizzle-orm'
import { LOGIN_ACTION_PREFIX, type OperationLogAction } from '#shared/config/audit-actions'
import { db } from '~~/server/db/client'
import { operationLogs, users } from '~~/server/db/schema'
import { recordAuditLog, type AuditLogStatus } from '~~/server/services/audit-log-writer'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'

export type OperationLogStatus = AuditLogStatus

export interface OperationLogInput {
  userId?: number | null
  actor?: string | null
  /**
   * 必须是注册表中已登记的操作日志动作码。
   *
   * 收窄成联合类型而不是 string，是为了让「新增审计事件忘记登记」在编译期就失败，
   * 而不是等到后台显示裸动作码时才被发现。这里刻意排除登录动作码：
   * 登录事件走 loginLogService，它会保证 detail 里带上查询侧依赖的 method 字段。
   */
  action: OperationLogAction
  resourceType?: string | null
  resourceId?: string | number | null
  ip?: string | null
  userAgent?: string | null
  detail?: Record<string, unknown> | null
  status?: OperationLogStatus
}

export interface OperationLogFilters {
  keyword?: string
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
}

interface ListOperationLogsInput extends OperationLogFilters {
  limit?: number
  offset?: number
}

function buildConditions(filters: OperationLogFilters): SQL[] {
  const conditions: SQL[] = [notLike(operationLogs.action, `${LOGIN_ACTION_PREFIX}%`)]
  const keyword = filters.keyword?.trim()
  if (keyword) {
    const keywordPattern = `%${keyword}%`
    conditions.push(or(
      ilike(operationLogs.actor, keywordPattern),
      ilike(operationLogs.action, keywordPattern),
      ilike(operationLogs.resourceType, keywordPattern),
      ilike(operationLogs.resourceId, keywordPattern),
      ilike(operationLogs.ip, keywordPattern),
      ilike(operationLogs.userAgent, keywordPattern),
      sql`${operationLogs.userId}::text ilike ${keywordPattern}`
    )!)
  }
  if (typeof filters.userId === 'number') conditions.push(eq(operationLogs.userId, filters.userId))
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
  if (filters.actor) conditions.push(ilike(operationLogs.actor, `%${filters.actor}%`))
  if (filters.action) conditions.push(like(operationLogs.action, `${filters.action}%`))
  if (filters.resourceType) conditions.push(eq(operationLogs.resourceType, filters.resourceType))
  if (filters.status) conditions.push(eq(operationLogs.status, filters.status))
  if (filters.startAt) conditions.push(gte(operationLogs.createdAt, filters.startAt))
  if (filters.endAt) conditions.push(lte(operationLogs.createdAt, filters.endAt))
  return conditions
}

function matchingOperationLogIds(filters: OperationLogFilters) {
  return db.select({ id: operationLogs.id })
    .from(operationLogs)
    .leftJoin(users, eq(users.id, operationLogs.userId))
    .where(and(...buildConditions(filters)))
}

interface OperationLogListResult {
  items: Array<typeof operationLogs.$inferSelect & { actorRole: 'user' | 'admin' | null }>
  total: number
}

export const operationLogService = {
  /** 记录一条操作事件。写入语义见 recordAuditLog。 */
  async addLog(input: OperationLogInput) {
    await recordAuditLog(input)
  },

  async list(filters: ListOperationLogsInput = {}): Promise<OperationLogListResult> {
    // 登录事件与其他审计事件共用一张表，但继续由专门的登录日志页面展示。
    const conditions = buildConditions(filters)

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
  },

  async deleteMatching(filters: OperationLogFilters): Promise<number> {
    const deletedLogs = db.$with('deleted_operation_logs').as(
      db.delete(operationLogs)
        .where(inArray(operationLogs.id, matchingOperationLogIds(filters)))
        .returning({ id: operationLogs.id })
    )
    const rows = await db.with(deletedLogs)
      .select({ value: count() })
      .from(deletedLogs)
    return toNumber(rows[0]?.value)
  }
}
