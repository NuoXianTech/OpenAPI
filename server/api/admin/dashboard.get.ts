import type { H3Event } from 'h3'
import { and, asc, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import { apiCallStats, apiCalls, apis, users } from '@nuxthub/db/schema'
import { requireAdmin } from '~~/server/utils/auth'
import { addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/localTime'
import type {
  AdminDashboardData,
  AdminDashboardDistributionItem,
  AdminDashboardRecentCall,
  AdminDashboardTrendPoint
} from '~~/shared/types/admin-dashboard'

function toNumber(value: number | string | null | undefined) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function resolveRange(raw: unknown): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 7
  return Math.min(Math.max(Math.trunc(parsed), 1), 90)
}

export default defineEventHandler(async (event: H3Event): Promise<AdminDashboardData> => {
  await requireAdmin(event)

  const query = getQuery(event)
  const days = resolveRange(query.days ?? 7)
  const distributionLimit = Math.min(Math.max(Math.trunc(Number(query.top ?? 6)), 1), 20)
  const recentLimit = Math.min(Math.max(Math.trunc(Number(query.recent ?? 10)), 1), 50)

  const todayStart = getLocalDayStart(new Date())
  const yesterdayStart = addLocalDays(todayStart, -1)
  const rangeStart = addLocalDays(todayStart, -(days - 1))
  const tomorrowStart = addLocalDays(todayStart, 1)

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
    db.select({ userCount: sql<number>`count(*)` }).from(users).where(isNull(users.deletedAt)),
    db.select({
      enabledApiCount: sql<number>`coalesce(sum(case when ${apis.isEnabled} then 1 else 0 end), 0)`,
      totalApiCount: sql<number>`count(*)`
    }).from(apis),
    db.select({
      totalCalls: totalExpr,
      successCalls: successExpr,
      failureCalls: failureExpr
    }).from(apiCallStats),
    db.select({ todayCalls: totalExpr }).from(apiCallStats).where(and(
      gte(apiCallStats.statDate, todayStart),
      lt(apiCallStats.statDate, tomorrowStart)
    )),
    db.select({ yesterdayCalls: totalExpr }).from(apiCallStats).where(and(
      gte(apiCallStats.statDate, yesterdayStart),
      lt(apiCallStats.statDate, todayStart)
    )),
    db.select({
      statDate: apiCallStats.statDate,
      totalCalls: totalExpr,
      successCalls: successExpr,
      failureCalls: failureExpr
    }).from(apiCallStats)
      .where(and(
        gte(apiCallStats.statDate, rangeStart),
        lt(apiCallStats.statDate, tomorrowStart)
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
        gte(apiCallStats.statDate, rangeStart),
        lt(apiCallStats.statDate, tomorrowStart)
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
  const userCount = toNumber(userRows[0]?.userCount)
  const enabledApiCount = toNumber(apiCountRows[0]?.enabledApiCount)
  const totalApiCount = toNumber(apiCountRows[0]?.totalApiCount)

  const trendMap = new Map<string, AdminDashboardTrendPoint>()
  for (const row of trendRows) {
    const key = toLocalDateKey(row.statDate)
    trendMap.set(key, {
      date: key,
      totalCalls: toNumber(row.totalCalls),
      successCalls: toNumber(row.successCalls),
      failureCalls: toNumber(row.failureCalls)
    })
  }

  const trend: AdminDashboardTrendPoint[] = Array.from({ length: days }, (_, index) => {
    const date = addLocalDays(rangeStart, index)
    const key = toLocalDateKey(date)
    return trendMap.get(key) || { date: key, totalCalls: 0, successCalls: 0, failureCalls: 0 }
  })

  const distribution: AdminDashboardDistributionItem[] = distributionRows.map((row: {
    apiId: number
    name: string | null
    apiPath: string | null
    totalCalls: number | string | null
  }) => ({
    apiId: row.apiId,
    name: row.name || '未命名接口',
    apiPath: row.apiPath || '',
    totalCalls: toNumber(row.totalCalls)
  }))

  const recentCalls: AdminDashboardRecentCall[] = recentRows.map((row: {
    id: number
    apiName: string | null
    apiPath: string
    method: string
    statusCode: number
    latencyMs: number
    createdAt: Date
  }) => ({
    id: row.id,
    apiName: row.apiName || '-',
    apiPath: row.apiPath,
    method: row.method,
    statusCode: row.statusCode,
    latencyMs: row.latencyMs,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString()
  }))

  const todayChangeRate = yesterdayCalls > 0
    ? Number((((todayCalls - yesterdayCalls) / yesterdayCalls) * 100).toFixed(2))
    : todayCalls > 0 ? 100 : 0

  const data: AdminDashboardData = {
    overview: {
      userCount,
      enabledApiCount,
      totalApiCount,
      totalCalls,
      successCalls,
      failureCalls,
      successRate: totalCalls ? Number(((successCalls / totalCalls) * 100).toFixed(2)) : 0,
      todayCalls,
      yesterdayCalls,
      todayChangeRate
    },
    trend,
    distribution,
    recentCalls,
    generatedAt: new Date().toISOString()
  }

  return data
})
