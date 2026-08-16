import { eq, sql } from 'drizzle-orm'
import { apiCallStats, apiCalls } from '~~/server/db/schema'
import { toLocalDateKey } from '~~/server/utils/local-time'
import { db, type DatabaseTransaction } from '~~/server/db/client'

interface AddCallInput {
  routeId: string
  targetName?: string | null
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
    routeId: data.routeId,
    targetName: data.targetName ?? null,
    apiKeyId: data.apiKeyId ?? null,
    apiKeyName: data.apiKeyName ?? null,
    userId: data.userId ?? null,
    ...(data.requestId ? { requestId: data.requestId } : {}),
    path: data.path,
    method: data.method,
    statusCode: Math.trunc(data.statusCode),
    latencyMs: Math.max(Math.trunc(data.latencyMs), 0),
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

  async addCallAndUpsertDailyStat(data: AddCallInput & {
    statDate?: Date
    statusCodeForStats?: number
  }) {
    const row = normalizeCallRow({ ...data, isCounted: true })
    const statDate = toLocalDateKey(data.statDate || new Date())
    const statStatusCode = Math.trunc(data.statusCodeForStats ?? row.statusCode)
    const successDelta = statStatusCode >= 200 && statStatusCode < 400 && !data.errorCode ? 1 : 0
    const failureDelta = successDelta ? 0 : 1

    return db.transaction(async (tx: DatabaseTransaction) => {
      const inserted = await tx.insert(apiCalls).values(row).returning({ id: apiCalls.id })
      const callId = inserted[0]?.id ?? null

      await tx.insert(apiCallStats).values({
        routeId: data.routeId,
        statDate,
        totalCount: 1,
        successCount: successDelta,
        failureCount: failureDelta
      }).onConflictDoUpdate({
        target: [apiCallStats.routeId, apiCallStats.statDate],
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

  async patchCreditsCost(callId: number, creditsCost: number) {
    await db.update(apiCalls)
      .set({ creditsCost: Math.max(Math.trunc(creditsCost), 0) })
      .where(eq(apiCalls.id, callId))
  }
}
