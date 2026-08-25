import { and, asc, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import type {
  AdminDashboardData,
  AdminDashboardDistributionItem,
  AdminDashboardHourlyPoint,
  AdminDashboardInsightsData,
  AdminDashboardRecentCall,
  AdminDashboardTrendPoint
} from '#shared/types/admin'
import { db } from '~~/server/db/client'
import { apiCallStats, apiCalls, apiProducts, apiRoutes, apiVersions, users } from '~~/server/db/schema'
import { toIsoString } from '~~/server/utils/date'
import { APP_TIME_ZONE, addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { clampInteger, toNumber } from '~~/server/utils/number'

const HOURLY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

export const adminDashboardService = {
  async getDashboard(options: {
    days?: number
    distributionLimit?: number
    recentLimit?: number
  } = {}): Promise<AdminDashboardData> {
    const days = clampInteger(options.days, 1, 90, 7)
    const distributionLimit = clampInteger(options.distributionLimit, 1, 50, 8)
    const recentLimit = clampInteger(options.recentLimit, 1, 50, 8)
    const todayStart = getLocalDayStart()
    const rangeStart = addLocalDays(todayStart, -(days - 1))
    const yesterdayKey = toLocalDateKey(addLocalDays(todayStart, -1))
    const tomorrowKey = toLocalDateKey(addLocalDays(todayStart, 1))
    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
    const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`

    const [userRows, routeCountRows, summaryRows, trendRows, distributionRows, recentRows] = await Promise.all([
      db.select({ userCount: sql<number>`count(*)` }).from(users),
      db.select({
        totalApiCount: sql<number>`count(*)`,
        enabledApiCount: sql<number>`count(*) filter (where ${apiRoutes.state} = 'active')`
      }).from(apiRoutes).where(isNull(apiRoutes.deletedAt)),
      db.select({
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats),
      db.select({
        statDate: apiCallStats.statDate,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats)
        .where(and(
          gte(apiCallStats.statDate, toLocalDateKey(addLocalDays(rangeStart, -1))),
          lt(apiCallStats.statDate, tomorrowKey)
        ))
        .groupBy(apiCallStats.statDate)
        .orderBy(asc(apiCallStats.statDate)),
      db.select({
        routeId: apiCallStats.routeId,
        name: apiRoutes.name,
        apiPath: apiRoutes.pathPattern,
        totalCalls: totalExpr
      }).from(apiCallStats)
        .innerJoin(apiRoutes, eq(apiRoutes.id, apiCallStats.routeId))
        .where(and(
          isNull(apiRoutes.deletedAt),
          gte(apiCallStats.statDate, toLocalDateKey(rangeStart)),
          lt(apiCallStats.statDate, tomorrowKey)
        ))
        .groupBy(apiCallStats.routeId, apiRoutes.name, apiRoutes.pathPattern)
        .orderBy(desc(totalExpr), asc(apiRoutes.name))
        .limit(distributionLimit),
      db.select({
        id: apiCalls.id,
        apiName: sql<string | null>`coalesce(${apiRoutes.name}, ${apiProducts.name}, ${apiCalls.routeName})`,
        apiPath: apiCalls.path,
        method: apiCalls.method,
        statusCode: apiCalls.statusCode,
        errorCode: apiCalls.errorCode,
        isCounted: apiCalls.isCounted,
        latencyMs: apiCalls.latencyMs,
        createdAt: apiCalls.createdAt
      }).from(apiCalls)
        .leftJoin(apiRoutes, eq(apiRoutes.id, apiCalls.routeId))
        .leftJoin(apiVersions, eq(apiVersions.id, apiRoutes.apiVersionId))
        .leftJoin(apiProducts, eq(apiProducts.id, apiVersions.productId))
        .orderBy(desc(apiCalls.createdAt))
        .limit(recentLimit)
    ])

    const summary = normalizeStats(summaryRows[0])
    const trendMap = new Map<string, AdminDashboardTrendPoint>()
    for (const row of trendRows) {
      trendMap.set(row.statDate, {
        date: row.statDate,
        totalCalls: toNumber(row.totalCalls),
        successCalls: toNumber(row.successCalls),
        failureCalls: toNumber(row.failureCalls)
      })
    }
    const trend = Array.from({ length: days }, (_, index): AdminDashboardTrendPoint => {
      const date = toLocalDateKey(addLocalDays(rangeStart, index))
      return trendMap.get(date) ?? { date, totalCalls: 0, successCalls: 0, failureCalls: 0 }
    })
    const todayCalls = trendMap.get(toLocalDateKey(todayStart))?.totalCalls ?? 0
    const yesterdayCalls = trendMap.get(yesterdayKey)?.totalCalls ?? 0
    const distribution: AdminDashboardDistributionItem[] = distributionRows.map(row => ({
      routeId: row.routeId,
      name: row.name,
      apiPath: row.apiPath,
      totalCalls: toNumber(row.totalCalls)
    }))
    const recentCalls: AdminDashboardRecentCall[] = recentRows.map(row => ({
      ...row,
      apiName: row.apiName || '-',
      createdAt: toIsoString(row.createdAt)
    }))

    return {
      overview: {
        userCount: toNumber(userRows[0]?.userCount),
        enabledApiCount: toNumber(routeCountRows[0]?.enabledApiCount),
        totalApiCount: toNumber(routeCountRows[0]?.totalApiCount),
        totalCalls: summary.totalCalls,
        successCalls: summary.successCalls,
        failureCalls: summary.failureCalls,
        successRate: summary.totalCalls
          ? Number(((summary.successCalls / summary.totalCalls) * 100).toFixed(2))
          : 0,
        todayCalls,
        yesterdayCalls,
        todayChangeRate: yesterdayCalls > 0
          ? Number((((todayCalls - yesterdayCalls) / yesterdayCalls) * 100).toFixed(2))
          : todayCalls > 0 ? 100 : 0
      },
      trend,
      distribution,
      recentCalls,
      generatedAt: new Date().toISOString()
    }
  },

  async getInsights(): Promise<AdminDashboardInsightsData> {
    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const hourlySource = db.select({
      hour: sql<Date>`date_trunc('hour', ${apiCalls.createdAt})`.as('hour')
    }).from(apiCalls)
      .where(and(gte(apiCalls.createdAt, last24hStart), eq(apiCalls.isCounted, true)))
      .as('hourly_source')

    const hourlyRows = await db.select({ hour: hourlySource.hour, totalCalls: sql<number>`count(*)` })
      .from(hourlySource)
      .groupBy(hourlySource.hour)
      .orderBy(asc(hourlySource.hour))

    const hourMap = new Map<string, number>()
    for (const row of hourlyRows) {
      const date = row.hour instanceof Date ? row.hour : new Date(row.hour)
      hourMap.set(date.toISOString(), toNumber(row.totalCalls))
    }
    const nowHour = new Date()
    nowHour.setMinutes(0, 0, 0)
    const hourlyTrend24h: AdminDashboardHourlyPoint[] = Array.from({ length: 24 }, (_, index) => {
      const date = new Date(nowHour.getTime() - (23 - index) * 60 * 60 * 1000)
      const hour = date.toISOString()
      return { hour, label: HOURLY_LABEL_FORMATTER.format(date), totalCalls: hourMap.get(hour) ?? 0 }
    })
    return { hourlyTrend24h }
  }
}

function normalizeStats(row?: {
  totalCalls?: number | string | null
  successCalls?: number | string | null
  failureCalls?: number | string | null
}) {
  return {
    totalCalls: toNumber(row?.totalCalls),
    successCalls: toNumber(row?.successCalls),
    failureCalls: toNumber(row?.failureCalls)
  }
}
