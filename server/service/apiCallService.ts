import { count, desc, eq, sql } from 'drizzle-orm'
import { apiCallStats, apiCalls, apis } from '@nuxthub/db/schema'

function getDayStartUtc(value: Date) {
  const start = new Date(value)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

export interface AddCallInput {
  apiId: number
  apiKeyId?: number | null
  userId?: number | null
  path: string
  method: string
  statusCode: number
  latencyMs: number
  ip?: string | null
  userAgent?: string | null
  referer?: string | null
  queryString?: string | null
  apiVersion?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  requestSize?: number | null
  responseSize?: number | null
  requestSnapshot?: Record<string, unknown> | null
  upstreamStatusCode?: number | null
  upstreamLatencyMs?: number | null
  cacheHit?: boolean
  errorCode?: string | null
  errorMessage?: string | null
}

function normalizeCallRow(data: AddCallInput) {
  return {
    apiId: data.apiId,
    apiKeyId: data.apiKeyId ?? null,
    userId: data.userId ?? null,
    path: data.path,
    method: data.method,
    statusCode: data.statusCode,
    latencyMs: data.latencyMs,
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
    referer: data.referer ?? null,
    queryString: data.queryString ?? null,
    apiVersion: data.apiVersion ?? null,
    country: data.country ?? null,
    region: data.region ?? null,
    city: data.city ?? null,
    requestSize: data.requestSize ?? null,
    responseSize: data.responseSize ?? null,
    requestSnapshot: data.requestSnapshot ?? null,
    upstreamStatusCode: data.upstreamStatusCode ?? null,
    upstreamLatencyMs: data.upstreamLatencyMs ?? null,
    cacheHit: data.cacheHit ?? false,
    errorCode: data.errorCode ?? null,
    errorMessage: data.errorMessage ?? null,
  }
}

export const apiCallService = {
  async list() {
    return db.select().from(apiCalls).orderBy(desc(apiCalls.createdAt))
  },

  async listByApi(apiId: number) {
    return db.select().from(apiCalls).where(eq(apiCalls.apiId, apiId)).orderBy(desc(apiCalls.createdAt))
  },

  /** 用户调用汇总（成功/失败/总数），按 apiCalls.userId 过滤 */
  async getSummaryForUser(userId: number) {
    const rows = await db.select({
      total: count(),
      success: sql<number>`count(*) filter (where ${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400)`,
      failure: sql<number>`count(*) filter (where ${apiCalls.statusCode} >= 400)`,
    }).from(apiCalls).where(eq(apiCalls.userId, userId))
    const r = rows[0] || { total: 0, success: 0, failure: 0 }
    return {
      total: Number(r.total) || 0,
      success: Number(r.success) || 0,
      failure: Number(r.failure) || 0,
    }
  },

  /** 用户按 API 聚合的调用列表，便于 /user/calls 展示 */
  async listAggregatedByUser(userId: number, limit = 100) {
    return db.select({
      apiId: apiCalls.apiId,
      apiPath: apis.apiPath,
      apiName: apis.name,
      httpMethod: apis.httpMethod,
      totalCount: count(),
      successCount: sql<number>`count(*) filter (where ${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400)`,
      failureCount: sql<number>`count(*) filter (where ${apiCalls.statusCode} >= 400)`,
      lastCallAt: sql<Date>`max(${apiCalls.createdAt})`,
      avgLatencyMs: sql<number>`coalesce(avg(${apiCalls.latencyMs}), 0)`,
    })
      .from(apiCalls)
      .leftJoin(apis, eq(apis.id, apiCalls.apiId))
      .where(eq(apiCalls.userId, userId))
      .groupBy(apiCalls.apiId, apis.apiPath, apis.name, apis.httpMethod)
      .orderBy(desc(count()))
      .limit(limit)
  },

  /** 用户最近的调用明细，便于 /user/calls 展示 */
  async listRecentForUser(userId: number, limit = 50) {
    return db.select({
      id: apiCalls.id,
      apiId: apiCalls.apiId,
      apiPath: apiCalls.path,
      method: apiCalls.method,
      statusCode: apiCalls.statusCode,
      latencyMs: apiCalls.latencyMs,
      ip: apiCalls.ip,
      createdAt: apiCalls.createdAt,
    })
      .from(apiCalls)
      .where(eq(apiCalls.userId, userId))
      .orderBy(desc(apiCalls.createdAt))
      .limit(limit)
  },

  async addCall(data: AddCallInput) {
    return db.insert(apiCalls).values(normalizeCallRow(data)).returning()
  },

  async addCallAndUpsertDailyStat(data: AddCallInput & {
    statDate?: Date
    statApiPath?: string | null
  }) {
    const normalizedStatusCode = Math.trunc(data.statusCode)
    const normalizedLatencyMs = Math.max(Math.trunc(data.latencyMs), 0)
    const statDate = getDayStartUtc(data.statDate || new Date())
    const successDelta = normalizedStatusCode >= 200 && normalizedStatusCode < 400 ? 1 : 0
    const failureDelta = successDelta ? 0 : 1

    return db.transaction(async (tx: typeof db) => {
      const inserted = await tx.insert(apiCalls).values({
        ...normalizeCallRow(data),
        statusCode: normalizedStatusCode,
        latencyMs: normalizedLatencyMs,
      }).returning({ id: apiCalls.id })

      const callId = inserted[0]?.id ?? null

      await tx.insert(apiCallStats).values({
        apiId: data.apiId,
        lastApiCallId: callId,
        statDate,
        totalCount: 1,
        successCount: successDelta,
        failureCount: failureDelta,
        apiPath: data.statApiPath ?? data.path,
      }).onConflictDoUpdate({
        target: [apiCallStats.apiId, apiCallStats.statDate],
        set: {
          lastApiCallId: callId,
          totalCount: sql`${apiCallStats.totalCount} + 1`,
          successCount: sql`${apiCallStats.successCount} + ${successDelta}`,
          failureCount: sql`${apiCallStats.failureCount} + ${failureDelta}`,
          apiPath: data.statApiPath ?? data.path,
          updatedAt: new Date(),
        },
      })

      return callId
    })
  },
}
