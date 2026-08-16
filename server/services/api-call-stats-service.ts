import { and, asc, desc, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsSummary,
  PublicCallStatsTrendPoint
} from '#shared/types/public-stats'
import type { DashboardCallRankItem } from '#shared/types/dashboard'
import { PUBLIC_STATS_DASHBOARD_CACHE_TTL_SECONDS } from '#shared/config/public-stats'
import { db } from '~~/server/db/client'
import { apiCallStats, users } from '~~/server/db/schema'
import { activeRoutingCatalogService } from '~~/server/services/active-routing-catalog-service'
import { addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { clampInteger, toNumber } from '~~/server/utils/number'
import { getSharedCache } from '~~/server/utils/shared-cache'

const PUBLIC_STATS_SUMMARY_TTL_SECONDS = 10
const PUBLIC_USER_COUNT_TTL_SECONDS = 60
const PUBLIC_RANKING_WINDOW_DAYS = 30
const PUBLIC_STATS_CACHE_SCHEMA_VERSION = 5
const PUBLIC_STATS_SUMMARY_CACHE_SCHEMA_VERSION = 4

interface CallStatsTotals {
  totalCalls: number
  successCalls: number
  failureCalls: number
}

function normalizeTotals(row?: {
  totalCalls?: number | string | null
  successCalls?: number | string | null
  failureCalls?: number | string | null
}): CallStatsTotals {
  return {
    totalCalls: toNumber(row?.totalCalls),
    successCalls: toNumber(row?.successCalls),
    failureCalls: toNumber(row?.failureCalls)
  }
}

function statsWhere(routeIds: string[], condition?: SQL): SQL {
  const routeCondition = routeIds.length > 0
    ? inArray(apiCallStats.routeId, routeIds)
    : sql`false`
  return condition ? and(routeCondition, condition)! : routeCondition
}

async function loadTotals(routeIds: string[], condition?: SQL): Promise<CallStatsTotals> {
  const rows = await db.select({
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`,
    successCalls: sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`,
    failureCalls: sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`
  }).from(apiCallStats).where(statsWhere(routeIds, condition))
  return normalizeTotals(rows[0])
}

async function getRegisteredUserCount(): Promise<number> {
  return getSharedCache<number>({
    key: 'cache:public:user-count',
    ttlSeconds: PUBLIC_USER_COUNT_TTL_SECONDS,
    async loader() {
      const rows = await db.select({ userCount: sql<number>`count(*)` }).from(users)
      return toNumber(rows[0]?.userCount)
    }
  })
}

async function loadPublicSummary(): Promise<PublicCallStatsSummary> {
  const routes = (await activeRoutingCatalogService.list())
    .filter(item => item.route.isStatistics)
  const [totals, userCount] = await Promise.all([
    loadTotals(routes.map(item => item.route.id)),
    getRegisteredUserCount()
  ])
  return {
    totalCalls: totals.totalCalls,
    successRate: totals.totalCalls
      ? Number(((totals.successCalls / totals.totalCalls) * 100).toFixed(2))
      : 0,
    userCount
  }
}

async function loadPublicDashboard(days: number, topLimit: number): Promise<PublicCallStatsDashboard> {
  const activeRoutes = (await activeRoutingCatalogService.list())
    .filter(item => item.route.isStatistics)
  const routeIds = activeRoutes.map(item => item.route.id)
  const routeById = new Map(activeRoutes.map(item => [item.route.id, item.route]))
  const todayStart = getLocalDayStart(new Date())
  const todayKey = toLocalDateKey(todayStart)
  const yesterdayKey = toLocalDateKey(addLocalDays(todayStart, -1))
  const rangeStart = addLocalDays(todayStart, -(days - 1))
  const trendStart = addLocalDays(rangeStart, -1)
  const tomorrowKey = toLocalDateKey(addLocalDays(todayStart, 1))
  const rankingStart = toLocalDateKey(addLocalDays(todayStart, -(PUBLIC_RANKING_WINDOW_DAYS - 1)))
  const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
  const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`

  const [totals, userCount, trendRows, rankingRows] = await Promise.all([
    loadTotals(routeIds),
    getRegisteredUserCount(),
    db.select({
      statDate: apiCallStats.statDate,
      totalCalls: totalExpr,
      successCalls: successExpr,
      failureCalls: failureExpr
    }).from(apiCallStats)
      .where(statsWhere(routeIds, and(
        gte(apiCallStats.statDate, toLocalDateKey(trendStart)),
        lt(apiCallStats.statDate, tomorrowKey)
      )))
      .groupBy(apiCallStats.statDate)
      .orderBy(asc(apiCallStats.statDate)),
    db.select({
      routeId: apiCallStats.routeId,
      totalCalls: totalExpr,
      successCalls: successExpr
    }).from(apiCallStats)
      .where(statsWhere(routeIds, and(
        gte(apiCallStats.statDate, rankingStart),
        lt(apiCallStats.statDate, tomorrowKey)
      )))
      .groupBy(apiCallStats.routeId)
      .orderBy(desc(totalExpr))
      .limit(topLimit)
  ])

  const trendMap = new Map<string, PublicCallStatsTrendPoint>()
  for (const row of trendRows) {
    trendMap.set(row.statDate, {
      date: row.statDate,
      totalCalls: toNumber(row.totalCalls),
      successCalls: toNumber(row.successCalls),
      failureCalls: toNumber(row.failureCalls)
    })
  }
  const today = trendMap.get(todayKey) ?? {
    date: todayKey,
    totalCalls: 0,
    successCalls: 0,
    failureCalls: 0
  }
  const trend7d = Array.from({ length: days }, (_, index) => {
    const date = toLocalDateKey(addLocalDays(rangeStart, index))
    return trendMap.get(date) ?? {
      date,
      totalCalls: 0,
      successCalls: 0,
      failureCalls: 0
    }
  })
  const rankingLast30d: DashboardCallRankItem[] = rankingRows.flatMap((row, index) => {
    const route = routeById.get(row.routeId)
    if (!route) return []
    const totalCalls = toNumber(row.totalCalls)
    const successCalls = toNumber(row.successCalls)
    return [{
      rank: index + 1,
      routeId: row.routeId,
      name: route.name,
      apiPath: route.pathPattern,
      totalCalls,
      successRate: totalCalls
        ? Number(((successCalls / totalCalls) * 100).toFixed(2))
        : 0
    }]
  })

  return {
    overview: {
      totalCalls: totals.totalCalls,
      todayCalls: today.totalCalls,
      yesterdayCalls: trendMap.get(yesterdayKey)?.totalCalls ?? 0,
      successCalls: totals.successCalls,
      failureCalls: totals.failureCalls,
      successRate: totals.totalCalls
        ? Number(((totals.successCalls / totals.totalCalls) * 100).toFixed(2))
        : 0,
      userCount,
      enabledTrackedApiCount: activeRoutes.length,
      trackedApiCount: activeRoutes.length
    },
    trend7d,
    rankingLast30d,
    generatedAt: new Date().toISOString()
  }
}

export const apiCallStatsService = {
  async getPublicSummary(): Promise<PublicCallStatsSummary> {
    return getSharedCache<PublicCallStatsSummary>({
      key: `cache:public:stats-summary:s${PUBLIC_STATS_SUMMARY_CACHE_SCHEMA_VERSION}`,
      ttlSeconds: PUBLIC_STATS_SUMMARY_TTL_SECONDS,
      loader: loadPublicSummary
    })
  },

  async getPublicDashboard(options: { days?: number, topLimit?: number } = {}): Promise<PublicCallStatsDashboard> {
    const days = clampInteger(options.days || 7, 1, 30, 7)
    const topLimit = clampInteger(options.topLimit || 10, 1, 50, 10)
    return getSharedCache<PublicCallStatsDashboard>({
      key: `cache:public:stats:s${PUBLIC_STATS_CACHE_SCHEMA_VERSION}:${days}:${topLimit}`,
      ttlSeconds: PUBLIC_STATS_DASHBOARD_CACHE_TTL_SECONDS,
      loader: () => loadPublicDashboard(days, topLimit)
    })
  }
}
