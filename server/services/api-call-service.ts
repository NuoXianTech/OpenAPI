import { count, desc, eq, sql, and, ilike, isNull, or } from 'drizzle-orm'
import { apiCallStats, apiCalls, apiKeys, apis } from '~~/server/db/schema'
import { getLocalDayStart } from '~~/server/utils/local-time'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type { DatabaseTransaction } from '~~/server/db/client'

interface AddCallInput {
  apiId: number
  apiKeyId?: number | null
  apiKeyName?: string | null
  userId?: number | null
  requestId?: string | null
  path: string
  method: string
  statusCode: number
  latencyMs: number
  ip?: string | null
  userAgent?: string | null
  referer?: string | null
  queryString?: string | null
  requestSize?: number | null
  responseSize?: number | null
  errorCode?: string | null
  errorMessage?: string | null
  creditsCost?: number
  isCounted?: boolean
}

function normalizeCallRow(data: AddCallInput) {
  return {
    apiId: data.apiId,
    apiKeyId: data.apiKeyId ?? null,
    apiKeyName: data.apiKeyName ?? null,
    userId: data.userId ?? null,
    ...(data.requestId ? { requestId: data.requestId } : {}),
    path: data.path,
    method: data.method,
    statusCode: data.statusCode,
    latencyMs: data.latencyMs,
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
    referer: data.referer ?? null,
    queryString: data.queryString ?? null,
    requestSize: data.requestSize ?? null,
    responseSize: data.responseSize ?? null,
    errorCode: data.errorCode ?? null,
    errorMessage: data.errorMessage ?? null,
    creditsCost: Math.max(Math.trunc(data.creditsCost ?? 0), 0),
    isCounted: data.isCounted ?? true
  }
}

const callCountedCondition = sql`${apiCalls.isCounted} = true`
const callHttpSuccessCondition = sql`${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400 and ${apiCalls.errorCode} is null`
const callSuccessCondition = sql`${callCountedCondition} and ${callHttpSuccessCondition}`
const callFailureCondition = sql`${callCountedCondition} and not (${callHttpSuccessCondition})`

export const apiCallService = {
  /** 用户调用汇总（成功/失败/总数），按 apiCalls.userId 过滤 */
  async getSummaryForUser(userId: number) {
    const rows = await db.select({
      total: sql<number>`count(*) filter (where ${callCountedCondition})`,
      success: sql<number>`count(*) filter (where ${callSuccessCondition})`,
      failure: sql<number>`count(*) filter (where ${callFailureCondition})`
    }).from(apiCalls).where(eq(apiCalls.userId, userId))
    const r = rows[0] || { total: 0, success: 0, failure: 0 }
    return {
      total: toNumber(r.total),
      success: toNumber(r.success),
      failure: toNumber(r.failure)
    }
  },

  /**
   * 用户的可筛选调用日志：按 apiId / apiKeyId / 成功失败 过滤；
   * join apis & api_keys 携带名称给前端展示。
   */
  async listLogForUser(userId: number, opts: {
    keyword?: string
    apiId?: number
    apiKeyId?: number
    /** 'success' | 'failure' */
    status?: 'success' | 'failure'
    limit?: number
    offset?: number
  } = {}) {
    const { limit, offset } = normalizePagination(opts)
    const conds = [eq(apiCalls.userId, userId)]
    if (opts.apiId && opts.apiId > 0) conds.push(eq(apiCalls.apiId, opts.apiId))
    if (opts.apiKeyId && opts.apiKeyId > 0) conds.push(eq(apiCalls.apiKeyId, opts.apiKeyId))
    if (opts.status === 'success') {
      conds.push(callSuccessCondition)
    } else if (opts.status === 'failure') {
      conds.push(callFailureCondition)
    }
    const keyword = opts.keyword?.trim()
    if (keyword) {
      const keywordPattern = `%${keyword}%`
      conds.push(or(
        ilike(apis.name, keywordPattern),
        ilike(apiCalls.path, keywordPattern),
        ilike(apiCalls.method, keywordPattern),
        ilike(apiCalls.ip, keywordPattern),
        ilike(apiCalls.errorCode, keywordPattern),
        ilike(apiCalls.errorMessage, keywordPattern),
        ilike(apiCalls.apiKeyName, keywordPattern),
        ilike(apiKeys.name, keywordPattern),
        sql`${apiCalls.statusCode}::text ilike ${keywordPattern}`
      )!)
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
        .where(and(...conds))
        .orderBy(desc(apiCalls.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() })
        .from(apiCalls)
        .leftJoin(apis, eq(apis.id, apiCalls.apiId))
        .leftJoin(apiKeys, eq(apiKeys.id, apiCalls.apiKeyId))
        .where(and(...conds))
    ])

    return {
      items,
      total: toNumber(totalRows[0]?.value)
    }
  },

  /** 用户视角的筛选选项：他用过的 API 列表 + 自己的 Keys */
  async listFilterOptionsForUser(userId: number) {
    const apiOptionsRaw = await db.select({
      id: apis.id,
      name: apis.name,
      apiPath: apis.apiPath
    })
      .from(apis)
      .innerJoin(apiCalls, eq(apiCalls.apiId, apis.id))
      .where(eq(apiCalls.userId, userId))
      .groupBy(apis.id, apis.name, apis.apiPath)
      .orderBy(apis.name)

    const keyOptionsRaw = await db.select({
      id: apiKeys.id,
      name: apiKeys.name
    })
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
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
    statusCodeForStats?: number
  }) {
    const normalizedStatusCode = Math.trunc(data.statusCode)
    const normalizedLatencyMs = Math.max(Math.trunc(data.latencyMs), 0)
    const statDate = getLocalDayStart(data.statDate || new Date())
    const statStatusCode = Math.trunc(data.statusCodeForStats ?? normalizedStatusCode)
    const successDelta = statStatusCode >= 200 && statStatusCode < 400 && !data.errorCode ? 1 : 0
    const failureDelta = successDelta ? 0 : 1

    return db.transaction(async (tx: DatabaseTransaction) => {
      const inserted = await tx.insert(apiCalls).values({
        ...normalizeCallRow({ ...data, isCounted: true }),
        statusCode: normalizedStatusCode,
        latencyMs: normalizedLatencyMs
      }).returning({ id: apiCalls.id })

      const callId = inserted[0]?.id ?? null

      await tx.insert(apiCallStats).values({
        apiId: data.apiId,
        statDate,
        totalCount: 1,
        successCount: successDelta,
        failureCount: failureDelta
      }).onConflictDoUpdate({
        target: [apiCallStats.apiId, apiCallStats.statDate],
        set: {
          totalCount: sql`${apiCallStats.totalCount} + 1`,
          successCount: sql`${apiCallStats.successCount} + ${successDelta}`,
          failureCount: sql`${apiCallStats.failureCount} + ${failureDelta}`,
          updatedAt: new Date()
        }
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
  }
}
