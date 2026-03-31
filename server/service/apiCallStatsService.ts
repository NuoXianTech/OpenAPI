import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { apiCallStats, apiLists } from '@nuxthub/db/schema'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsTopItem,
  PublicCallStatsTrendPoint,
} from '~~/shared/types/public-stats'

function getDayStart(value: Date) {
  const start = new Date(value)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function toUtcDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toISOString().slice(0, 10)
}

function toNumber(value: number | string | null | undefined) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
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

  async getPublicDashboard(options: { days?: number, topLimit?: number } = {}): Promise<PublicCallStatsDashboard> {
    const days = Math.min(Math.max(Math.trunc(options.days || 7), 1), 30)
    const topLimit = Math.min(Math.max(Math.trunc(options.topLimit || 10), 1), 50)

    const todayStart = getDayStart(new Date())
    const rangeStart = addUtcDays(todayStart, -(days - 1))
    const tomorrowStart = addUtcDays(todayStart, 1)

    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
    const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`
    const publicApiCondition = and(
      eq(apiLists.isEnabled, true),
      eq(apiLists.isStatistics, true),
    )

    const [summaryRows, trendRows, topRows] = await Promise.all([
      db.select({
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr,
        trackedApiCount: sql<number>`count(distinct ${apiCallStats.apiListId})`,
      }).from(apiCallStats)
        .innerJoin(apiLists, eq(apiCallStats.apiListId, apiLists.id))
        .where(publicApiCondition),
      db.select({
        statDate: apiCallStats.statDate,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr,
      }).from(apiCallStats)
        .innerJoin(apiLists, eq(apiCallStats.apiListId, apiLists.id))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, rangeStart),
          lt(apiCallStats.statDate, tomorrowStart),
        ))
        .groupBy(apiCallStats.statDate)
        .orderBy(asc(apiCallStats.statDate)),
      db.select({
        apiListId: apiCallStats.apiListId,
        name: apiLists.name,
        apiPath: apiLists.apiPath,
        httpMethod: apiLists.httpMethod,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr,
      }).from(apiCallStats)
        .innerJoin(apiLists, eq(apiCallStats.apiListId, apiLists.id))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, todayStart),
          lt(apiCallStats.statDate, tomorrowStart),
        ))
        .groupBy(
          apiCallStats.apiListId,
          apiLists.name,
          apiLists.apiPath,
          apiLists.httpMethod,
        )
        .orderBy(desc(totalExpr), asc(apiLists.name))
        .limit(topLimit),
    ])

    const summary = summaryRows[0] || {
      totalCalls: 0,
      successCalls: 0,
      failureCalls: 0,
      trackedApiCount: 0,
    }

    const totalCalls = toNumber(summary.totalCalls)
    const successCalls = toNumber(summary.successCalls)
    const failureCalls = toNumber(summary.failureCalls)

    const trendMap = new Map<string, PublicCallStatsTrendPoint>()
    for (const row of trendRows) {
      const key = toUtcDateKey(row.statDate)
      trendMap.set(key, {
        date: key,
        totalCalls: toNumber(row.totalCalls),
        successCalls: toNumber(row.successCalls),
        failureCalls: toNumber(row.failureCalls),
      })
    }

    const trend7d: PublicCallStatsTrendPoint[] = Array.from({ length: days }, (_, index) => {
      const date = addUtcDays(rangeStart, index)
      const key = toUtcDateKey(date)
      return trendMap.get(key) || {
        date: key,
        totalCalls: 0,
        successCalls: 0,
        failureCalls: 0,
      }
    })

    const top10Today: PublicCallStatsTopItem[] = topRows.map((row, index) => {
      const rowTotalCalls = toNumber(row.totalCalls)
      const rowSuccessCalls = toNumber(row.successCalls)
      const rowFailureCalls = toNumber(row.failureCalls)
      return {
        rank: index + 1,
        apiListId: row.apiListId,
        name: row.name,
        apiPath: row.apiPath,
        httpMethod: row.httpMethod,
        totalCalls: rowTotalCalls,
        successCalls: rowSuccessCalls,
        failureCalls: rowFailureCalls,
        successRate: rowTotalCalls ? Number(((rowSuccessCalls / rowTotalCalls) * 100).toFixed(2)) : 0,
      }
    })

    return {
      overview: {
        totalCalls,
        successCalls,
        failureCalls,
        successRate: totalCalls ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0,
        trackedApiCount: toNumber(summary.trackedApiCount),
      },
      trend7d,
      top10Today,
      generatedAt: new Date().toISOString(),
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
