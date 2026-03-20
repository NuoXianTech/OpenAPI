import { eq } from 'drizzle-orm'
import { apiCallStats } from '../db/schema/apiCallStats'

export const apiCallStatsService = {
  async list() {
    return db.select().from(apiCallStats)
  },

  async listByApi(apiId: number) {
    return db.select().from(apiCallStats).where(eq(apiCallStats.apiId, apiId))
  },

  async upsertDailyStat(data: {
    apiId: number
    apiCallId?: number | null
    statDate: Date
    totalCount: number
    successCount: number
    failureCount: number
    avgLatencyMs: number
    minLatencyMs: number
    maxLatencyMs: number
    apiPath?: string | null
  }) {
    return db.insert(apiCallStats).values({
      apiId: data.apiId,
      apiCallId: data.apiCallId ?? null,
      statDate: data.statDate,
      totalCount: data.totalCount,
      successCount: data.successCount,
      failureCount: data.failureCount,
      avgLatencyMs: data.avgLatencyMs,
      minLatencyMs: data.minLatencyMs,
      maxLatencyMs: data.maxLatencyMs,
      apiPath: data.apiPath ?? null,
    }).returning()
  },
}
