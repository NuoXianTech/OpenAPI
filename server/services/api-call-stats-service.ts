import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { apiCallStats, apis, users } from '~~/server/db/schema'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsTrendPoint
} from '#shared/types/public-stats'
import type { DashboardCallRankItem } from '#shared/types/dashboard'
import { addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { clampInteger, toNumber } from '~~/server/utils/number'
import { getSharedCache, getSharedCacheVersion } from '~~/server/utils/shared-cache'

const PUBLIC_STATS_TTL_SECONDS = 12
const PUBLIC_STATS_VERSION = 'public-stats'
const PUBLIC_RANKING_WINDOW_DAYS = 30
const PUBLIC_STATS_CACHE_SCHEMA_VERSION = 2

async function loadPublicDashboard(days: number, topLimit: number): Promise<PublicCallStatsDashboard> {
  const todayStart = getLocalDayStart(new Date())
  const todayKey = toLocalDateKey(todayStart)
  const yesterdayStart = addLocalDays(todayStart, -1)
  const rangeStart = addLocalDays(todayStart, -(days - 1))
  const tomorrowStart = addLocalDays(todayStart, 1)
  const tomorrowKey = toLocalDateKey(tomorrowStart)
  // 调用排行固定按最近 30 个自然日聚合，与趋势图的 days 解耦
  const ranking30dStart = addLocalDays(todayStart, -(PUBLIC_RANKING_WINDOW_DAYS - 1))

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
        eq(apiCallStats.statDate, todayKey)
      )),
    db.select({
      yesterdayCalls: totalExpr
    }).from(apiCallStats)
      .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
      .where(and(
        publicApiCondition,
        eq(apiCallStats.statDate, toLocalDateKey(yesterdayStart))
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
        gte(apiCallStats.statDate, toLocalDateKey(rangeStart)),
        lt(apiCallStats.statDate, tomorrowKey)
      ))
      .groupBy(apiCallStats.statDate)
      .orderBy(asc(apiCallStats.statDate)),
    db.select({
      apiId: apiCallStats.apiId,
      name: apis.name,
      apiPath: apis.apiPath,
      totalCalls: totalExpr,
      successCalls: successExpr
    }).from(apiCallStats)
      .innerJoin(apis, eq(apiCallStats.apiId, apis.id))
      .where(and(
        publicApiCondition,
        gte(apiCallStats.statDate, toLocalDateKey(ranking30dStart)),
        lt(apiCallStats.statDate, tomorrowKey)
      ))
      .groupBy(
        apiCallStats.apiId,
        apis.name,
        apis.apiPath
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
    const key = row.statDate
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

  const rankingLast30d: DashboardCallRankItem[] = topRows.map((row: {
    apiId: number
    name: string
    apiPath: string
    totalCalls: number | string | null
    successCalls: number | string | null
  }, index: number) => {
    const rowTotalCalls = toNumber(row.totalCalls)
    const rowSuccessCalls = toNumber(row.successCalls)
    return {
      rank: index + 1,
      apiId: row.apiId,
      name: row.name,
      apiPath: row.apiPath,
      totalCalls: rowTotalCalls,
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
    rankingLast30d,
    generatedAt: new Date().toISOString()
  }
}

export const apiCallStatsService = {
  async getPublicDashboard(options: { days?: number, topLimit?: number } = {}): Promise<PublicCallStatsDashboard> {
    const days = clampInteger(options.days || 7, 1, 30, 7)
    const topLimit = clampInteger(options.topLimit || 10, 1, 50, 10)
    const version = await getSharedCacheVersion(PUBLIC_STATS_VERSION)

    return getSharedCache<PublicCallStatsDashboard>({
      key: `cache:public:stats:s${PUBLIC_STATS_CACHE_SCHEMA_VERSION}:v${version}:${days}:${topLimit}`,
      ttlSeconds: PUBLIC_STATS_TTL_SECONDS,
      loader: () => loadPublicDashboard(days, topLimit)
    })
  }
}
