import { and, count, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db/client'
import { apiCalls, apiCategories, apiKeys, apis, users } from '~~/server/db/schema'
import { toIsoString } from '~~/server/utils/date'
import { toNullableNumber, toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type {
  AdminLogRow,
  AdminLogType,
  AdminLogsFilterOptions,
  AdminLogsListResponse
} from '#shared/types/admin'

// ─────────────────────────────────────────────────────────────────────
// 类型映射 SQL 表达式
// ─────────────────────────────────────────────────────────────────────

/** api_calls 行 → AdminLogType（错误条件优先） */
const apiCallTypeExpr = sql<AdminLogType>`
  case
    when ${apiCalls.errorCode} is not null
      or ${apiCalls.statusCode} >= 400
      or ${apiCalls.isCounted} = false
    then 'error'
    else 'consume'
  end
`

// ─────────────────────────────────────────────────────────────────────
// 调用日志查询
// ─────────────────────────────────────────────────────────────────────

export interface AdminApiCallLogFilters {
  keyword?: string
  startAt?: Date
  endAt?: Date
  apiId?: number
  categoryId?: number
  types?: AdminLogType[]
  userId?: number
  apiKeyId?: number
  requestId?: string
}

interface ListAdminApiCallLogsInput extends AdminApiCallLogFilters {
  limit?: number
  offset?: number
}

function buildConditions(input: AdminApiCallLogFilters): SQL[] {
  const conditions: SQL[] = []
  const keyword = input.keyword?.trim()
  if (keyword) {
    const keywordPattern = `%${keyword}%`
    conditions.push(or(
      ilike(apis.name, keywordPattern),
      ilike(apiCalls.path, keywordPattern),
      ilike(apiCalls.method, keywordPattern),
      ilike(apiCalls.apiKeyName, keywordPattern),
      ilike(apiKeys.name, keywordPattern),
      ilike(users.username, keywordPattern),
      ilike(apiCategories.name, keywordPattern),
      ilike(apiCalls.ip, keywordPattern),
      ilike(apiCalls.errorCode, keywordPattern),
      ilike(apiCalls.errorMessage, keywordPattern),
      sql`${apiCalls.statusCode}::text ilike ${keywordPattern}`,
      sql`${apiCalls.requestId}::text ilike ${keywordPattern}`
    )!)
  }
  if (input.startAt) conditions.push(gte(apiCalls.createdAt, input.startAt))
  if (input.endAt) conditions.push(lt(apiCalls.createdAt, input.endAt))
  if (input.apiId && input.apiId > 0) conditions.push(eq(apiCalls.apiId, input.apiId))
  if (input.categoryId && input.categoryId > 0) conditions.push(eq(apis.categoryId, input.categoryId))
  if (input.userId && input.userId > 0) conditions.push(eq(apiCalls.userId, input.userId))
  if (input.apiKeyId && input.apiKeyId > 0) conditions.push(eq(apiCalls.apiKeyId, input.apiKeyId))
  if (input.requestId) {
    const requestId = z.uuid().safeParse(input.requestId)
    conditions.push(requestId.success ? eq(apiCalls.requestId, requestId.data) : sql`false`)
  }
  if (input.types && input.types.length > 0 && input.types.length < 2) {
    conditions.push(sql`(${apiCallTypeExpr}) in ${input.types}`)
  }
  return conditions
}

function matchingCallIds(input: AdminApiCallLogFilters) {
  const conditions = buildConditions(input)
  return db.select({ id: apiCalls.id })
    .from(apiCalls)
    .leftJoin(apis, eq(apis.id, apiCalls.apiId))
    .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
    .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
    .leftJoin(users, eq(users.id, apiCalls.userId))
    .where(conditions.length ? and(...conditions) : undefined)
}

export const adminApiCallLogService = {
  /**
   * 调用日志列表 · 单表查询 api_calls。
   *
   * 数据源仅 api_calls：积分流水请走 /admin/logs/credits，
   * 管理 / 系统操作请走 /admin/logs/operations。
   */
  async listLogs(input: ListAdminApiCallLogsInput = {}): Promise<AdminLogsListResponse> {
    const { limit, offset } = normalizePagination(input)

    const conditions = buildConditions(input)
    const where = conditions.length ? and(...conditions) : undefined

    const baseSelect = db.select({
      id: apiCalls.id,
      type: apiCallTypeExpr.as('type'),
      createdAt: apiCalls.createdAt,
      userId: apiCalls.userId,
      userName: users.username,
      userRole: users.role,
      apiKeyId: apiCalls.apiKeyId,
      apiKeyName: sql<string | null>`coalesce(${apiCalls.apiKeyName}, ${apiKeys.name})`,
      requestId: sql<string | null>`${apiCalls.requestId}::text`,
      apiId: apiCalls.apiId,
      apiName: apis.name,
      apiPath: apiCalls.path,
      categoryId: apis.categoryId,
      categoryName: apiCategories.name,
      method: apiCalls.method,
      statusCode: apiCalls.statusCode,
      latencyMs: apiCalls.latencyMs,
      cost: apiCalls.creditsCost,
      isCounted: apiCalls.isCounted,
      errorCode: apiCalls.errorCode,
      errorMessage: apiCalls.errorMessage,
      queryString: apiCalls.queryString,
      ip: apiCalls.ip,
      userAgent: apiCalls.userAgent,
      referer: apiCalls.referer,
      requestSize: apiCalls.requestSize,
      responseSize: apiCalls.responseSize
    })
      .from(apiCalls)
      .leftJoin(apis, eq(apis.id, apiCalls.apiId))
      .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))

    const countQuery = db.select({ value: sql<number>`count(*)` })
      .from(apiCalls)
      .leftJoin(apis, eq(apis.id, apiCalls.apiId))
      .leftJoin(apiCategories, eq(apiCategories.id, apis.categoryId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))

    const [items, totalRows] = await Promise.all([
      (where ? baseSelect.where(where) : baseSelect)
        .orderBy(sql`${apiCalls.createdAt} desc`)
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery
    ])

    const rows: AdminLogRow[] = (items as Array<typeof items[number]>).map(r => ({
      id: r.id,
      type: r.type,
      createdAt: toIsoString(r.createdAt),
      userId: r.userId,
      userName: r.userName,
      userRole: r.userRole,
      apiKeyId: r.apiKeyId,
      apiKeyName: r.apiKeyName,
      requestId: r.requestId,
      apiId: r.apiId,
      apiName: r.apiName,
      apiPath: r.apiPath,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      method: r.method,
      statusCode: r.statusCode,
      latencyMs: r.latencyMs,
      cost: toNumber(r.cost),
      isCounted: !!r.isCounted,
      errorCode: r.errorCode,
      errorMessage: r.errorMessage,
      queryString: r.queryString,
      ip: r.ip,
      userAgent: r.userAgent,
      referer: r.referer,
      requestSize: toNullableNumber(r.requestSize),
      responseSize: toNullableNumber(r.responseSize)
    }))

    return {
      items: rows,
      total: toNumber(totalRows[0]?.value)
    }
  },

  /** 调用日志的筛选下拉选项（接口 + 分类） */
  async listFilterOptions(): Promise<AdminLogsFilterOptions> {
    const [apiRows, categoryRows] = await Promise.all([
      db.select({ id: apis.id, name: apis.name, apiPath: apis.apiPath })
        .from(apis)
        .orderBy(apis.name),
      db.select({ id: apiCategories.id, name: apiCategories.name })
        .from(apiCategories)
        .where(sql`${apiCategories.deletedAt} is null`)
        .orderBy(apiCategories.sortOrder, apiCategories.name)
    ])
    return { apis: apiRows, categories: categoryRows }
  },

  async deleteMatching(input: AdminApiCallLogFilters): Promise<number> {
    const deletedLogs = db.$with('deleted_call_logs').as(
      db.delete(apiCalls)
        .where(inArray(apiCalls.id, matchingCallIds(input)))
        .returning({ id: apiCalls.id })
    )
    const rows = await db.with(deletedLogs)
      .select({ value: count() })
      .from(deletedLogs)
    return toNumber(rows[0]?.value)
  }
}
