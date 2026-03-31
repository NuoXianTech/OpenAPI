import { desc, eq, sql } from 'drizzle-orm'
import { apiCallStats } from '../db/schema/apiCallStats'

function getDayStart(value: Date) {
  const start = new Date(value)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

export const apiCallStatsService = {
  async list() {
    return db.select().from(apiCallStats).orderBy(desc(apiCallStats.statDate), desc(apiCallStats.updatedAt))
  },

  async listByApiList(apiListId: number) {
    return db.select().from(apiCallStats).where(eq(apiCallStats.apiListId, apiListId)).orderBy(desc(apiCallStats.statDate), desc(apiCallStats.updatedAt))
  },

  async getSummary() {
    const rows = await db.select({
      total: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`,
      success: sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`,
      failure: sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`,
    }).from(apiCallStats)

    const summary = rows[0] || { total: 0, success: 0, failure: 0 }
    return {
      total: Number(summary.total) || 0,
      success: Number(summary.success) || 0,
      failure: Number(summary.failure) || 0,
    }
  },

  async upsertDailyStat(data: {
    apiListId: number
    apiCallId?: number | null
    statDate: Date
    totalCount: number
    successCount: number
    failureCount: number
    apiPath?: string | null
  }) {
    const totalDelta = Math.max(Math.trunc(data.totalCount), 0)
    const successDelta = Math.max(Math.trunc(data.successCount), 0)
    const failureDelta = Math.max(Math.trunc(data.failureCount), 0)

    if (totalDelta === 0 && successDelta === 0 && failureDelta === 0) {
      return []
    }

    const statDate = getDayStart(data.statDate)
    return db.insert(apiCallStats).values({
      apiListId: data.apiListId,
      apiCallId: data.apiCallId ?? null,
      statDate,
      totalCount: totalDelta,
      successCount: successDelta,
      failureCount: failureDelta,
      apiPath: data.apiPath ?? null,
    }).onConflictDoUpdate({
      target: [apiCallStats.apiListId, apiCallStats.statDate],
      set: {
        apiCallId: data.apiCallId ?? null,
        totalCount: sql`${apiCallStats.totalCount} + ${totalDelta}`,
        successCount: sql`${apiCallStats.successCount} + ${successDelta}`,
        failureCount: sql`${apiCallStats.failureCount} + ${failureDelta}`,
        apiPath: data.apiPath ?? null,
        updatedAt: new Date(),
      },
    })
      .returning()
  },
}
