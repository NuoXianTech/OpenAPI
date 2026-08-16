import { and, count, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import type {
  AdminLogRow,
  AdminLogType,
  AdminLogsFilterOptions,
  AdminLogsListResponse
} from '#shared/types/admin'
import { db } from '~~/server/db/client'
import {
  apiCalls,
  apiCategories,
  apiKeys,
  apiProducts,
  apiRoutes,
  apiVersions,
  users
} from '~~/server/db/schema'
import { toIsoString } from '~~/server/utils/date'
import { toNullableNumber, toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'

const apiCallTypeExpr = sql<AdminLogType>`
  case
    when ${apiCalls.errorCode} is not null
      or ${apiCalls.statusCode} >= 400
      or ${apiCalls.isCounted} = false
    then 'error'
    else 'consume'
  end
`

export interface AdminApiCallLogFilters {
  keyword?: string
  startAt?: Date
  endAt?: Date
  routeId?: string
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
    const pattern = `%${keyword}%`
    conditions.push(or(
      ilike(apiRoutes.name, pattern),
      ilike(apiProducts.name, pattern),
      ilike(apiCalls.targetName, pattern),
      ilike(apiCalls.path, pattern),
      ilike(apiCalls.method, pattern),
      ilike(apiCalls.apiKeyName, pattern),
      ilike(apiKeys.name, pattern),
      ilike(users.username, pattern),
      ilike(apiCategories.name, pattern),
      ilike(apiCalls.ip, pattern),
      ilike(apiCalls.errorCode, pattern),
      ilike(apiCalls.errorMessage, pattern),
      sql`${apiCalls.statusCode}::text ilike ${pattern}`,
      sql`${apiCalls.requestId}::text ilike ${pattern}`
    )!)
  }
  if (input.startAt) conditions.push(gte(apiCalls.createdAt, input.startAt))
  if (input.endAt) conditions.push(lt(apiCalls.createdAt, input.endAt))
  if (input.routeId) {
    const routeId = z.uuid().safeParse(input.routeId)
    conditions.push(routeId.success ? eq(apiCalls.routeId, routeId.data) : sql`false`)
  }
  if (input.categoryId && input.categoryId > 0) conditions.push(eq(apiProducts.categoryId, input.categoryId))
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
    .leftJoin(apiRoutes, eq(apiRoutes.id, apiCalls.routeId))
    .leftJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
    .leftJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
    .leftJoin(apiCategories, eq(apiCategories.id, apiProducts.categoryId))
    .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
    .leftJoin(users, eq(users.id, apiCalls.userId))
    .where(conditions.length ? and(...conditions) : undefined)
}

export const adminApiCallLogService = {
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
      requestId: sql<string>`${apiCalls.requestId}::text`,
      routeId: apiCalls.routeId,
      apiName: sql<string | null>`coalesce(${apiRoutes.name}, ${apiProducts.name}, ${apiCalls.targetName})`,
      apiPath: apiCalls.path,
      categoryId: apiProducts.categoryId,
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
      .leftJoin(apiRoutes, eq(apiRoutes.id, apiCalls.routeId))
      .leftJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .leftJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .leftJoin(apiCategories, eq(apiCategories.id, apiProducts.categoryId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))
    const countQuery = db.select({ value: sql<number>`count(*)` })
      .from(apiCalls)
      .leftJoin(apiRoutes, eq(apiRoutes.id, apiCalls.routeId))
      .leftJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
      .leftJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
      .leftJoin(apiCategories, eq(apiCategories.id, apiProducts.categoryId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))
    const [items, totalRows] = await Promise.all([
      (where ? baseSelect.where(where) : baseSelect)
        .orderBy(sql`${apiCalls.createdAt} desc`)
        .limit(limit)
        .offset(offset),
      where ? countQuery.where(where) : countQuery
    ])

    const rows: AdminLogRow[] = items.map(row => ({
      ...row,
      createdAt: toIsoString(row.createdAt),
      cost: toNumber(row.cost),
      isCounted: Boolean(row.isCounted),
      requestSize: toNullableNumber(row.requestSize),
      responseSize: toNullableNumber(row.responseSize)
    }))
    return { items: rows, total: toNumber(totalRows[0]?.value) }
  },

  async listFilterOptions(): Promise<AdminLogsFilterOptions> {
    const [routeRows, categoryRows] = await Promise.all([
      db.select({ id: apiRoutes.id, name: apiRoutes.name, apiPath: apiRoutes.pathPattern })
        .from(apiRoutes)
        .where(sql`${apiRoutes.deletedAt} is null`)
        .orderBy(apiRoutes.name, apiRoutes.pathPattern),
      db.select({ id: apiCategories.id, name: apiCategories.name })
        .from(apiCategories)
        .where(sql`${apiCategories.deletedAt} is null`)
        .orderBy(apiCategories.sortOrder, apiCategories.name)
    ])
    return { routes: routeRows, categories: categoryRows }
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
