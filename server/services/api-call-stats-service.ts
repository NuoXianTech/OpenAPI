import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { apiCallStats, apis, users } from '~~/server/db/schema'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsTopItem,
  PublicCallStatsTrendPoint
} from '#shared/types/public-stats'
import { addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { clampInteger, toNumber } from '~~/server/utils/number'

export const apiCallStatsService = {
  async getPublicDashboard(options: { days?: number, topLimit?: number } = {}): Promise<PublicCallStatsDashboard> {
    const days = clampInteger(options.days || 7, 1, 30, 7)
    const topLimit = clampInteger(options.topLimit || 10, 1, 50, 10)

    const todayStart = getLocalDayStart(new Date())
    const yesterdayStart = addLocalDays(todayStart, -1)
    const rangeStart = addLocalDays(todayStart, -(days - 1))
    const tomorrowStart = addLocalDays(todayStart, 1)
    // TOP 10 固定按近 30 天聚合，与趋势图的 days 解耦
    const top30dStart = addLocalDays(todayStart, -29)

    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
    const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`
    const publicApiCondition = and(
      eq(apis.isEnabled, true),
      eq(apis.isStatistics, true)
    )

    const [summaryRows, todayRows, yesterdayRows, enabledTrackedApiRows, userRows, trendRows, topRows] = await Promise.all([
      db.select({
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr,
        trackedApiCount: sql<number>`count(distinct ${apiCallStats.apiId})`
      }).from(apiCallStats)
        .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
        .where(publicApiCondition),
      db.select({
        todayCalls: totalExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, todayStart),
          lt(apiCallStats.statDate, tomorrowStart)
        )),
      db.select({
        yesterdayCalls: totalExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, yesterdayStart),
          lt(apiCallStats.statDate, todayStart)
        )),
      db.select({
        enabledTrackedApiCount: sql<number>`count(*)`
      }).from(apis)
        .where(publicApiCondition),
      db.select({
        userCount: sql<number>`count(*)`
      }).from(users)
        .where(and(
          eq(users.isActive, true),
          eq(users.isBanned, false)
        )),
      db.select({
        statDate: apiCallStats.statDate,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, rangeStart),
          lt(apiCallStats.statDate, tomorrowStart)
        ))
        .groupBy(apiCallStats.statDate)
        .orderBy(asc(apiCallStats.statDate)),
      db.select({
        apiId: apiCallStats.apiId,
        name: apis.name,
        apiPath: apis.apiPath,
        httpMethod: apis.httpMethod,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
        .where(and(
          publicApiCondition,
          gte(apiCallStats.statDate, top30dStart),
          lt(apiCallStats.statDate, tomorrowStart)
        ))
        .groupBy(
          apiCallStats.apiId,
          apis.name,
          apis.apiPath,
          apis.httpMethod
        )
        .orderBy(desc(totalExpr), asc(apis.name))
        .limit(topLimit)
    ])

    const summary = summaryRows[0] || {
      totalCalls: 0,
      successCalls: 0,
      failureCalls: 0,
      trackedApiCount: 0
    }
    const todaySummary = todayRows[0] || { todayCalls: 0 }
    const yesterdaySummary = yesterdayRows[0] || { yesterdayCalls: 0 }
    const enabledTrackedApiSummary = enabledTrackedApiRows[0] || { enabledTrackedApiCount: 0 }
    const userSummary = userRows[0] || { userCount: 0 }

    const totalCalls = toNumber(summary.totalCalls)
    const todayCalls = toNumber(todaySummary.todayCalls)
    const yesterdayCalls = toNumber(yesterdaySummary.yesterdayCalls)
    const successCalls = toNumber(summary.successCalls)
    const failureCalls = toNumber(summary.failureCalls)

    const trendMap = new Map<string, PublicCallStatsTrendPoint>()
    for (const row of trendRows) {
      const key = toLocalDateKey(row.statDate)
      trendMap.set(key, {
        date: key,
        totalCalls: toNumber(row.totalCalls),
        successCalls: toNumber(row.successCalls),
        failureCalls: toNumber(row.failureCalls)
      })
    }

    const trend7d: PublicCallStatsTrendPoint[] = Array.from({ length: days }, (_, index) => {
      const date = addLocalDays(rangeStart, index)
      const key = toLocalDateKey(date)
      return trendMap.get(key) || {
        date: key,
        totalCalls: 0,
        successCalls: 0,
        failureCalls: 0
      }
    })

    const top10Last30d: PublicCallStatsTopItem[] = topRows.map((row: {
      apiId: number
      name: string
      apiPath: string
      httpMethod: string
      totalCalls: number | string | null
      successCalls: number | string | null
      failureCalls: number | string | null
    }, index: number) => {
      const rowTotalCalls = toNumber(row.totalCalls)
      const rowSuccessCalls = toNumber(row.successCalls)
      const rowFailureCalls = toNumber(row.failureCalls)
      return {
        rank: index + 1,
        apiId: row.apiId,
        name: row.name,
        apiPath: row.apiPath,
        httpMethod: row.httpMethod,
        totalCalls: rowTotalCalls,
        successCalls: rowSuccessCalls,
        failureCalls: rowFailureCalls,
        successRate: rowTotalCalls ? Number(((rowSuccessCalls / rowTotalCalls) * 100).toFixed(2)) : 0
      }
    })

    return {
      overview: {
        totalCalls,
        todayCalls,
        yesterdayCalls,
        successCalls,
        failureCalls,
        successRate: totalCalls ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0,
        userCount: toNumber(userSummary.userCount),
        enabledTrackedApiCount: toNumber(enabledTrackedApiSummary.enabledTrackedApiCount),
        trackedApiCount: toNumber(summary.trackedApiCount)
      },
      trend7d,
      top10Last30d,
      generatedAt: new Date().toISOString()
    }
  }
}
