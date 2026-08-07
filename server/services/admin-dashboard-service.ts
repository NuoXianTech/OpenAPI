import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { apiCallStats, apiCalls, apis, users } from '~~/server/db/schema'
import { db } from '~~/server/db/client'
import { toIsoString } from '~~/server/utils/date'
import { APP_TIME_ZONE, addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { clampInteger, toNumber } from '~~/server/utils/number'
import type {
  AdminDashboardData,
  AdminDashboardDistributionItem,
  AdminDashboardHourlyPoint,
  AdminDashboardInsightsData,
  AdminDashboardRecentCall,
  AdminDashboardTrendPoint
} from '#shared/types/admin'
import type { DashboardCallRankItem } from '#shared/types/dashboard'

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
    const distributionLimit = clampInteger(options.distributionLimit, 1, 20, 5)
    const recentLimit = clampInteger(options.recentLimit, 1, 50, 10)
    const todayStart = getLocalDayStart(new Date())
    const todayKey = toLocalDateKey(todayStart)
    const yesterdayStart = addLocalDays(todayStart, -1)
    const rangeStart = addLocalDays(todayStart, -(days - 1))
    const tomorrowKey = toLocalDateKey(addLocalDays(todayStart, 1))
    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
    const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`

    const [
      userRows,
      apiCountRows,
      summaryRows,
      todayRows,
      yesterdayRows,
      trendRows,
      distributionRows,
      recentRows
    ] = await Promise.all([
      db.select({ userCount: sql<number>`count(*)` }).from(users),
      db.select({
        enabledApiCount: sql<number>`coalesce(sum(case when ${apis.isEnabled} then 1 else 0 end), 0)`,
        totalApiCount: sql<number>`count(*)`
      }).from(apis),
      db.select({ totalCalls: totalExpr, successCalls: successExpr, failureCalls: failureExpr })
        .from(apiCallStats),
      db.select({ todayCalls: totalExpr }).from(apiCallStats)
        .where(eq(apiCallStats.statDate, todayKey)),
      db.select({ yesterdayCalls: totalExpr }).from(apiCallStats)
        .where(eq(apiCallStats.statDate, toLocalDateKey(yesterdayStart))),
      db.select({
        statDate: apiCallStats.statDate,
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats)
        .where(and(
          gte(apiCallStats.statDate, toLocalDateKey(rangeStart)),
          lt(apiCallStats.statDate, tomorrowKey)
        ))
        .groupBy(apiCallStats.statDate)
        .orderBy(asc(apiCallStats.statDate)),
      db.select({
        apiId: apiCallStats.apiId,
        name: apis.name,
        apiPath: apis.apiPath,
        totalCalls: totalExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
        .where(and(
          gte(apiCallStats.statDate, toLocalDateKey(rangeStart)),
          lt(apiCallStats.statDate, tomorrowKey)
        ))
        .groupBy(apiCallStats.apiId, apis.name, apis.apiPath)
        .orderBy(desc(totalExpr), asc(apis.name))
        .limit(distributionLimit),
      db.select({
        id: apiCalls.id,
        apiName: apis.name,
        apiPath: apiCalls.path,
        method: apiCalls.method,
        statusCode: apiCalls.statusCode,
        errorCode: apiCalls.errorCode,
        isCounted: apiCalls.isCounted,
        latencyMs: apiCalls.latencyMs,
        createdAt: apiCalls.createdAt
      }).from(apiCalls)
        .leftJoin(apis, eq(apiCalls.apiId, apis.id))
        .orderBy(desc(apiCalls.createdAt))
        .limit(recentLimit)
    ])

    const summary = summaryRows[0] || { totalCalls: 0, successCalls: 0, failureCalls: 0 }
    const totalCalls = toNumber(summary.totalCalls)
    const successCalls = toNumber(summary.successCalls)
    const failureCalls = toNumber(summary.failureCalls)
    const todayCalls = toNumber(todayRows[0]?.todayCalls)
    const yesterdayCalls = toNumber(yesterdayRows[0]?.yesterdayCalls)
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
      const key = toLocalDateKey(addLocalDays(rangeStart, index))
      return trendMap.get(key) || { date: key, totalCalls: 0, successCalls: 0, failureCalls: 0 }
    })
    const distribution: AdminDashboardDistributionItem[] = distributionRows.map(row => ({
      apiId: row.apiId,
      name: row.name || '未命名接口',
      apiPath: row.apiPath || '',
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
        enabledApiCount: toNumber(apiCountRows[0]?.enabledApiCount),
        totalApiCount: toNumber(apiCountRows[0]?.totalApiCount),
        totalCalls,
        successCalls,
        failureCalls,
        successRate: totalCalls ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0,
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

  async getInsights(options: { rankingLimit?: number } = {}): Promise<AdminDashboardInsightsData> {
    const rankingLimit = clampInteger(options.rankingLimit, 1, 50, 10)
    const last24hStart = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const publicApiCondition = and(eq(apis.isEnabled, true), eq(apis.isStatistics, true))
    const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
    const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
    const hourlySource = db.select({
      hour: sql<Date>`date_trunc('hour', ${apiCalls.createdAt})`.as('hour')
    }).from(apiCalls)
      .innerJoin(apis, eq(apis.id, apiCalls.apiId))
      .where(and(publicApiCondition, gte(apiCalls.createdAt, last24hStart), eq(apiCalls.isCounted, true)))
      .as('hourly_source')

    const [hourlyRows, rankingRows] = await Promise.all([
      db.select({ hour: hourlySource.hour, totalCalls: sql<number>`count(*)` })
        .from(hourlySource)
        .groupBy(hourlySource.hour)
        .orderBy(asc(hourlySource.hour)),
      db.select({
        apiId: apis.id,
        name: apis.name,
        apiPath: apis.apiPath,
        totalCalls: totalExpr,
        successCalls: successExpr
      }).from(apiCallStats)
        .innerJoin(apis, eq(apis.id, apiCallStats.apiId))
        .where(publicApiCondition)
        .groupBy(apis.id, apis.name, apis.apiPath)
        .orderBy(desc(totalExpr), asc(apis.name))
        .limit(rankingLimit)
    ])

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
    const ranking: DashboardCallRankItem[] = rankingRows.map((row, index) => {
      const totalCalls = toNumber(row.totalCalls)
      const successCalls = toNumber(row.successCalls)
      return {
        rank: index + 1,
        apiId: row.apiId,
        name: row.name,
        apiPath: row.apiPath,
        totalCalls,
        successRate: totalCalls ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0
      }
    })
    return { hourlyTrend24h, ranking }
  }
}
