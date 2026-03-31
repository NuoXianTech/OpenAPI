import { desc, eq, sql } from 'drizzle-orm'
import { apiCallStats, apiCalls } from '@nuxthub/db/schema'

function getDayStartUtc(value: Date) {
  const start = new Date(value)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

export const apiCallService = {
  async list() {
    return db.select().from(apiCalls).orderBy(desc(apiCalls.createdAt))
  },

  async listByApiList(apiListId: number) {
    return db.select().from(apiCalls).where(eq(apiCalls.apiListId, apiListId)).orderBy(desc(apiCalls.createdAt))
  },

  async addCall(data: {
    apiListId: number
    apiKeyId?: number | null
    userId?: number | null
    path: string
    method: string
    statusCode: number
    latencyMs: number
    ip?: string | null
    requestSize?: number | null
    responseSize?: number | null
    rawRequest?: string | null
  }) {
    return db.insert(apiCalls).values({
      apiListId: data.apiListId,
      apiKeyId: data.apiKeyId ?? null,
      userId: data.userId ?? null,
      path: data.path,
      method: data.method,
      statusCode: data.statusCode,
      latencyMs: data.latencyMs,
      ip: data.ip ?? null,
      requestSize: data.requestSize ?? null,
      responseSize: data.responseSize ?? null,
      rawRequest: data.rawRequest ?? null,
    }).returning()
  },

  async addCallAndUpsertDailyStat(data: {
    apiListId: number
    apiKeyId?: number | null
    userId?: number | null
    path: string
    method: string
    statusCode: number
    latencyMs: number
    ip?: string | null
    requestSize?: number | null
    responseSize?: number | null
    rawRequest?: string | null
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
        apiListId: data.apiListId,
        apiKeyId: data.apiKeyId ?? null,
        userId: data.userId ?? null,
        path: data.path,
        method: data.method,
        statusCode: normalizedStatusCode,
        latencyMs: normalizedLatencyMs,
        ip: data.ip ?? null,
        requestSize: data.requestSize ?? null,
        responseSize: data.responseSize ?? null,
        rawRequest: data.rawRequest ?? null,
      }).returning({ id: apiCalls.id })

      const callId = inserted[0]?.id ?? null

      await tx.insert(apiCallStats).values({
        apiListId: data.apiListId,
        apiCallId: callId,
        statDate,
        totalCount: 1,
        successCount: successDelta,
        failureCount: failureDelta,
        apiPath: data.statApiPath ?? data.path,
      }).onConflictDoUpdate({
        target: [apiCallStats.apiListId, apiCallStats.statDate],
        set: {
          apiCallId: callId,
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
