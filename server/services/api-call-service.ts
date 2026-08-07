import { eq, sql } from 'drizzle-orm'
import { apiCallStats, apiCalls } from '~~/server/db/schema'
import { toLocalDateKey } from '~~/server/utils/local-time'
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

export const apiCallService = {
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
    const statDate = toLocalDateKey(data.statDate || new Date())
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
