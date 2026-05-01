import { count, desc, eq, sql, and, type SQL } from 'drizzle-orm'
import { apiCallStats, apiCalls, apiKeys, apis, users } from '@nuxthub/db/schema'
import { getLocalDayStart } from '~~/server/utils/localTime'

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
  creditsCost?: number
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
    creditsCost: Math.max(Math.trunc(data.creditsCost ?? 0), 0),
  }
}

export const apiCallService = {
  async list() {
    return db.select().from(apiCalls).orderBy(desc(apiCalls.createdAt))
  },

  /**
   * Admin 视角调用日志：join apis & api_keys & users 携带展示字段。
   * 支持 userId / apiId / status 过滤 + 分页。
   */
  async listForAdmin(opts: {
    userId?: number
    apiId?: number
    apiKeyId?: number
    status?: 'success' | 'failure'
    limit?: number
    offset?: number
  } = {}) {
    const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(opts.offset ?? 0), 0)
    const conds: SQL[] = []
    if (opts.userId && opts.userId > 0) conds.push(eq(apiCalls.userId, opts.userId))
    if (opts.apiId && opts.apiId > 0) conds.push(eq(apiCalls.apiId, opts.apiId))
    if (opts.apiKeyId && opts.apiKeyId > 0) conds.push(eq(apiCalls.apiKeyId, opts.apiKeyId))
    if (opts.status === 'success') {
      conds.push(sql`${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400`)
    }
    else if (opts.status === 'failure') {
      conds.push(sql`${apiCalls.statusCode} >= 400`)
    }

    const where = conds.length ? and(...conds) : undefined
    const baseQuery = db.select({
      id: apiCalls.id,
      apiId: apiCalls.apiId,
      apiName: apis.name,
      apiPath: apiCalls.path,
      method: apiCalls.method,
      statusCode: apiCalls.statusCode,
      latencyMs: apiCalls.latencyMs,
      ip: apiCalls.ip,
      apiKeyId: apiCalls.apiKeyId,
      apiKeyName: apiKeys.name,
      userId: apiCalls.userId,
      userName: users.username,
      errorCode: apiCalls.errorCode,
      errorMessage: apiCalls.errorMessage,
      creditsCost: apiCalls.creditsCost,
      createdAt: apiCalls.createdAt,
    })
      .from(apiCalls)
      .leftJoin(apis, eq(apis.id, apiCalls.apiId))
      .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
      .leftJoin(users, eq(users.id, apiCalls.userId))

    const [items, totalRows] = await Promise.all([
      where
        ? baseQuery.where(where).orderBy(desc(apiCalls.createdAt)).limit(limit).offset(offset)
        : baseQuery.orderBy(desc(apiCalls.createdAt)).limit(limit).offset(offset),
      where
        ? db.select({ value: count() }).from(apiCalls).where(where)
        : db.select({ value: count() }).from(apiCalls),
    ])

    return {
      items,
      total: Number(totalRows[0]?.value || 0),
    }
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

  /**
   * 用户的可筛选调用日志：按 apiId / apiKeyId / 成功失败 过滤；
   * join apis & api_keys 携带名称给前端展示。
   */
  async listLogForUser(userId: number, opts: {
    apiId?: number
    apiKeyId?: number
    /** 'success' | 'failure' */
    status?: 'success' | 'failure'
    limit?: number
    offset?: number
  } = {}) {
    const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(opts.offset ?? 0), 0)
    const conds = [eq(apiCalls.userId, userId)]
    if (opts.apiId && opts.apiId > 0) conds.push(eq(apiCalls.apiId, opts.apiId))
    if (opts.apiKeyId && opts.apiKeyId > 0) conds.push(eq(apiCalls.apiKeyId, opts.apiKeyId))
    if (opts.status === 'success') {
      conds.push(sql`${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400`)
    }
    else if (opts.status === 'failure') {
      conds.push(sql`${apiCalls.statusCode} >= 400`)
    }

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
        apiKeyName: apiKeys.name,
        errorCode: apiCalls.errorCode,
        errorMessage: apiCalls.errorMessage,
        creditsCost: apiCalls.creditsCost,
        createdAt: apiCalls.createdAt,
      })
        .from(apiCalls)
        .leftJoin(apis, eq(apis.id, apiCalls.apiId))
        .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
        .where(and(...conds))
        .orderBy(desc(apiCalls.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(apiCalls).where(and(...conds)),
    ])

    return {
      items,
      total: Number(totalRows[0]?.value || 0),
    }
  },

  /** 用户视角的筛选选项：他用过的 API 列表 + 自己的 Keys */
  async listFilterOptionsForUser(userId: number) {
    const apiOptionsRaw = await db.select({
      id: apis.id,
      name: apis.name,
      apiPath: apis.apiPath,
    })
      .from(apis)
      .innerJoin(apiCalls, eq(apiCalls.apiId, apis.id))
      .where(eq(apiCalls.userId, userId))
      .groupBy(apis.id, apis.name, apis.apiPath)
      .orderBy(apis.name)

    const keyOptionsRaw = await db.select({
      id: apiKeys.id,
      name: apiKeys.name,
    })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt))

    return { apis: apiOptionsRaw, apiKeys: keyOptionsRaw }
  },

  async addCall(data: AddCallInput) {
    return db.insert(apiCalls).values(normalizeCallRow(data)).returning()
  },

  /**
   * 统计修正后的 status code（业务标记 forced=failed 时，HTTP 可能仍是 200，
   * 但要让 daily stats 视为失败）。不传则使用 data.statusCode。
   */
  async addCallAndUpsertDailyStat(data: AddCallInput & {
    statDate?: Date
    statApiPath?: string | null
    statusCodeForStats?: number
  }) {
    const normalizedStatusCode = Math.trunc(data.statusCode)
    const normalizedLatencyMs = Math.max(Math.trunc(data.latencyMs), 0)
    const statDate = getLocalDayStart(data.statDate || new Date())
    const statStatusCode = Math.trunc(data.statusCodeForStats ?? normalizedStatusCode)
    const successDelta = statStatusCode >= 200 && statStatusCode < 400 ? 1 : 0
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

  /** 扣费完成后回填 apiCalls.creditsCost */
  async patchCreditsCost(callId: number, creditsCost: number) {
    const value = Math.max(Math.trunc(creditsCost), 0)
    await db.update(apiCalls)
      .set({ creditsCost: value })
      .where(eq(apiCalls.id, callId))
  },
}
