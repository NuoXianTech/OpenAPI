import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { apiCalls, apiKeys, apis } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'

const countedCondition = sql`${apiCalls.isCounted} = true`
const httpSuccessCondition = sql`${apiCalls.statusCode} >= 200
  and ${apiCalls.statusCode} < 400
  and ${apiCalls.errorCode} is null`
const successCondition = sql`${countedCondition} and ${httpSuccessCondition}`
const failureCondition = sql`${countedCondition} and not (${httpSuccessCondition})`

interface UserApiCallFilters {
  keyword?: string
  apiId?: number
  apiKeyId?: number
  status?: 'success' | 'failure'
  limit?: number
  offset?: number
}

export const userApiCallService = {
  async getSummary(userId: number) {
    const rows = await db.select({
      total: sql<number>`count(*) filter (where ${countedCondition})`,
      success: sql<number>`count(*) filter (where ${successCondition})`,
      failure: sql<number>`count(*) filter (where ${failureCondition})`
    }).from(apiCalls).where(eq(apiCalls.userId, userId))
    const summary = rows[0] || { total: 0, success: 0, failure: 0 }
    return {
      total: toNumber(summary.total),
      success: toNumber(summary.success),
      failure: toNumber(summary.failure)
    }
  },

  async list(userId: number, filters: UserApiCallFilters = {}) {
    const { limit, offset } = normalizePagination(filters)
    const conditions = [eq(apiCalls.userId, userId)]
    if (filters.apiId && filters.apiId > 0) conditions.push(eq(apiCalls.apiId, filters.apiId))
    if (filters.apiKeyId && filters.apiKeyId > 0) conditions.push(eq(apiCalls.apiKeyId, filters.apiKeyId))
    if (filters.status === 'success') conditions.push(successCondition)
    if (filters.status === 'failure') conditions.push(failureCondition)

    const keyword = filters.keyword?.trim()
    if (keyword) {
      const pattern = `%${keyword}%`
      conditions.push(or(
        ilike(apis.name, pattern),
        ilike(apiCalls.path, pattern),
        ilike(apiCalls.method, pattern),
        ilike(apiCalls.ip, pattern),
        ilike(apiCalls.errorCode, pattern),
        ilike(apiCalls.errorMessage, pattern),
        ilike(apiCalls.apiKeyName, pattern),
        ilike(apiKeys.name, pattern),
        sql`${apiCalls.statusCode}::text ilike ${pattern}`
      )!)
    }

    const where = and(...conditions)
    const [items, totalRows] = await Promise.all([
      db.select({
        id: apiCalls.id,
        apiId: apiCalls.apiId,
        apiName: apis.name,
        apiPath: apiCalls.path,
        method: apiCalls.method,
        statusCode: apiCalls.statusCode,
        latencyMs: apiCalls.latencyMs,
        ip: apiCalls.ip,
        apiKeyId: apiCalls.apiKeyId,
        apiKeyName: sql<string | null>`coalesce(${apiCalls.apiKeyName}, ${apiKeys.name})`,
        errorCode: apiCalls.errorCode,
        errorMessage: apiCalls.errorMessage,
        creditsCost: apiCalls.creditsCost,
        isCounted: apiCalls.isCounted,
        createdAt: apiCalls.createdAt
      })
        .from(apiCalls)
        .leftJoin(apis, eq(apis.id, apiCalls.apiId))
        .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
        .where(where)
        .orderBy(desc(apiCalls.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() })
        .from(apiCalls)
        .leftJoin(apis, eq(apis.id, apiCalls.apiId))
        .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
        .where(where)
    ])

    return { items, total: toNumber(totalRows[0]?.value) }
  },

  async listFilterOptions(userId: number) {
    const [apiOptions, apiKeyOptions] = await Promise.all([
      db.select({ id: apis.id, name: apis.name, apiPath: apis.apiPath })
        .from(apis)
        .innerJoin(apiCalls, eq(apiCalls.apiId, apis.id))
        .where(eq(apiCalls.userId, userId))
        .groupBy(apis.id, apis.name, apis.apiPath)
        .orderBy(apis.name),
      db.select({ id: apiKeys.id, name: apiKeys.name })
        .from(apiKeys)
        .where(eq(apiKeys.userId, userId))
        .orderBy(desc(apiKeys.createdAt))
    ])
    return { apis: apiOptions, apiKeys: apiKeyOptions }
  }
}
