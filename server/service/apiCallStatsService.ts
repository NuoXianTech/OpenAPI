import { and, eq } from 'drizzle-orm'
import { apiCallStats } from '../db/schema/apiCallStats'

function getDayStart(value: Date) {
  const start = new Date(value)
  start.setHours(0, 0, 0, 0)
  return start
}

export const apiCallStatsService = {
  async list() {
    return db.select().from(apiCallStats)
  },

  async listByApiList(apiListId: number) {
    return db.select().from(apiCallStats).where(eq(apiCallStats.apiListId, apiListId))
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
    const statDate = getDayStart(data.statDate)
    const existing = await db.select().from(apiCallStats).where(
      and(
        eq(apiCallStats.apiListId, data.apiListId),
        eq(apiCallStats.statDate, statDate),
      ),
    ).limit(1)

    const current = existing[0]
    if (!current) {
      return db.insert(apiCallStats).values({
        apiListId: data.apiListId,
        apiCallId: data.apiCallId ?? null,
        statDate,
        totalCount: data.totalCount,
        successCount: data.successCount,
        failureCount: data.failureCount,
        apiPath: data.apiPath ?? null,
      }).returning()
    }

    return db.update(apiCallStats)
      .set({
        apiCallId: data.apiCallId ?? current.apiCallId,
        totalCount: current.totalCount + data.totalCount,
        successCount: current.successCount + data.successCount,
        failureCount: current.failureCount + data.failureCount,
        apiPath: data.apiPath ?? current.apiPath,
        updatedAt: new Date(),
      })
      .where(eq(apiCallStats.id, current.id))
      .returning()
  },
}
