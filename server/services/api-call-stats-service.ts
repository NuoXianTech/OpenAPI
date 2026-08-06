import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { apiCallStats, apis, users } from '~~/server/db/schema'
import type {
  PublicCallStatsDashboard,
  PublicCallStatsSummary,
  PublicCallStatsTrendPoint
} from '#shared/types/public-stats'
import type { DashboardCallRankItem } from '#shared/types/dashboard'
import { addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { clampInteger, toNumber } from '~~/server/utils/number'
import { getSharedCache, getSharedCacheVersion } from '~~/server/utils/shared-cache'

const PUBLIC_STATS_TTL_SECONDS = 30
const PUBLIC_STATS_SUMMARY_TTL_SECONDS = 10
const PUBLIC_STATS_HISTORY_TTL_SECONDS = 2 * 24 * 60 * 60
const PUBLIC_USER_COUNT_TTL_SECONDS = 60
const PUBLIC_STATS_VERSION = 'public-stats'
const PUBLIC_RANKING_WINDOW_DAYS = 30
const PUBLIC_STATS_CACHE_SCHEMA_VERSION = 3
const PUBLIC_STATS_SUMMARY_CACHE_SCHEMA_VERSION = 2
const PUBLIC_STATS_HISTORY_CACHE_SCHEMA_VERSION = 1
const PUBLIC_USER_COUNT_CACHE_SCHEMA_VERSION = 1

interface CallStatsTotals {
  totalCalls: number
  successCalls: number
  failureCalls: number
}

function normalizeCallStatsTotals(row?: {
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

function addCallStatsTotals(left: CallStatsTotals, right: CallStatsTotals): CallStatsTotals {
  return {
    totalCalls: left.totalCalls + right.totalCalls,
    successCalls: left.successCalls + right.successCalls,
    failureCalls: left.failureCalls + right.failureCalls
  }
}

async function getHistoricalCallStats(todayKey: string): Promise<CallStatsTotals> {
  const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
  const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`

  return getSharedCache<CallStatsTotals>({
    // 已结束自然日不会再产生正常调用写入，按日期缓存后无需每 10 秒扫描全部历史。
    key: `cache:public:stats-history:s${PUBLIC_STATS_HISTORY_CACHE_SCHEMA_VERSION}:${todayKey}`,
    ttlSeconds: PUBLIC_STATS_HISTORY_TTL_SECONDS,
    async loader() {
      const rows = await db.select({
        totalCalls: totalExpr,
        successCalls: successExpr,
        failureCalls: failureExpr
      }).from(apiCallStats)
        .where(lt(apiCallStats.statDate, todayKey))

      return normalizeCallStatsTotals(rows[0])
    }
  })
}

async function loadCallStatsForDay(dayKey: string): Promise<CallStatsTotals> {
  const rows = await db.select({
    totalCalls: sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`,
    successCalls: sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`,
    failureCalls: sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`
  }).from(apiCallStats)
    .where(eq(apiCallStats.statDate, dayKey))

  return normalizeCallStatsTotals(rows[0])
}

async function getRegisteredUserCount(): Promise<number> {
  return getSharedCache<number>({
    key: `cache:public:user-count:s${PUBLIC_USER_COUNT_CACHE_SCHEMA_VERSION}`,
    ttlSeconds: PUBLIC_USER_COUNT_TTL_SECONDS,
    async loader() {
      const rows = await db.select({ userCount: sql<number>`count(*)` }).from(users)
      return toNumber(rows[0]?.userCount)
    }
  })
}

async function loadPublicSummary(todayKey: string): Promise<PublicCallStatsSummary> {
  const [historical, today, userCount] = await Promise.all([
    getHistoricalCallStats(todayKey),
    loadCallStatsForDay(todayKey),
    getRegisteredUserCount()
  ])
  const totals = addCallStatsTotals(historical, today)

  return {
    totalCalls: totals.totalCalls,
    successRate: totals.totalCalls
      ? Number(((totals.successCalls / totals.totalCalls) * 100).toFixed(2))
      : 0,
    userCount
  }
}

async function loadPublicDashboard(days: number, topLimit: number): Promise<PublicCallStatsDashboard> {
  const todayStart = getLocalDayStart(new Date())
  const todayKey = toLocalDateKey(todayStart)
  const yesterdayStart = addLocalDays(todayStart, -1)
  const yesterdayKey = toLocalDateKey(yesterdayStart)
  const rangeStart = addLocalDays(todayStart, -(days - 1))
  const statsRangeStart = days === 1 ? yesterdayStart : rangeStart
  const tomorrowStart = addLocalDays(todayStart, 1)
  const tomorrowKey = toLocalDateKey(tomorrowStart)
  // 调用排行固定按最近 30 个自然日聚合，与趋势图的 days 解耦
  const ranking30dStart = addLocalDays(todayStart, -(PUBLIC_RANKING_WINDOW_DAYS - 1))

  const totalExpr = sql<number>`coalesce(sum(${apiCallStats.totalCount}), 0)`
  const successExpr = sql<number>`coalesce(sum(${apiCallStats.successCount}), 0)`
  const failureExpr = sql<number>`coalesce(sum(${apiCallStats.failureCount}), 0)`
  const rankedApiCondition = and(
    eq(apis.isEnabled, true),
    eq(apis.isStatistics, true)
  )

  const [historicalTotals, apiCountRows, userCount, trendRows, topRows] = await Promise.all([
    getHistoricalCallStats(todayKey),
    db.select({
      trackedApiCount: sql<number>`count(*) filter (where ${apis.isStatistics} = true)`,
      enabledTrackedApiCount: sql<number>`count(*) filter (
        where ${apis.isStatistics} = true and ${apis.isEnabled} = true
      )`
    }).from(apis),
    getRegisteredUserCount(),
    db.select({
      statDate: apiCallStats.statDate,
      totalCalls: totalExpr,
      successCalls: successExpr,
      failureCalls: failureExpr
    }).from(apiCallStats)
      .where(and(
        gte(apiCallStats.statDate, toLocalDateKey(statsRangeStart)),
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
        rankedApiCondition,
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

  const apiCountSummary = apiCountRows[0] || {
    trackedApiCount: 0,
    enabledTrackedApiCount: 0
  }

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

  const todayTotals = trendMap.get(todayKey) || {
    date: todayKey,
    totalCalls: 0,
    successCalls: 0,
    failureCalls: 0
  }
  const totals = addCallStatsTotals(historicalTotals, todayTotals)
  const yesterdayCalls = trendMap.get(yesterdayKey)?.totalCalls ?? 0

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
      totalCalls: totals.totalCalls,
      todayCalls: todayTotals.totalCalls,
      yesterdayCalls,
      successCalls: totals.successCalls,
      failureCalls: totals.failureCalls,
      successRate: totals.totalCalls
        ? Number(((totals.successCalls / totals.totalCalls) * 100).toFixed(2))
        : 0,
      userCount,
      enabledTrackedApiCount: toNumber(apiCountSummary.enabledTrackedApiCount),
      trackedApiCount: toNumber(apiCountSummary.trackedApiCount)
    },
    trend7d,
    rankingLast30d,
    generatedAt: new Date().toISOString()
  }
}

export const apiCallStatsService = {
  async getPublicSummary(): Promise<PublicCallStatsSummary> {
    const todayKey = toLocalDateKey(getLocalDayStart(new Date()))

    return getSharedCache<PublicCallStatsSummary>({
      key: `cache:public:stats-summary:s${PUBLIC_STATS_SUMMARY_CACHE_SCHEMA_VERSION}:${todayKey}`,
      ttlSeconds: PUBLIC_STATS_SUMMARY_TTL_SECONDS,
      loader: () => loadPublicSummary(todayKey)
    })
  },

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
