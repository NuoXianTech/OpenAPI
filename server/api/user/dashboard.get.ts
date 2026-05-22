import type { H3Event } from 'h3'
import { and, asc, eq, gte, sql } from 'drizzle-orm'
import { apiCalls, apiKeys, users } from '@nuxthub/db/schema'
import { createError } from 'h3'
import { requireAuth } from '~~/server/utils/auth'
import { addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/localTime'
import type { UserDashboardData, UserDashboardTrendPoint } from '~~/shared/types/user-dashboard'

function toNumber(value: number | string | null | undefined) {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

const TREND_DAYS = 7

export default defineEventHandler(async (event: H3Event): Promise<UserDashboardData> => {
  const user = await requireAuth(event)
  if (!user.id || user.kind !== 'user') {
    throw createError({ statusCode: 403, message: 'admin 无个人概览数据' })
  }
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  const userId = user.id
  const now = new Date()
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const todayStart = getLocalDayStart(now)
  const rangeStart = addLocalDays(todayStart, -(TREND_DAYS - 1))
  const tomorrowStart = addLocalDays(todayStart, 1)

  const totalExpr = sql<number>`count(*)`
  const callSuccessCondition = sql`${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400 and ${apiCalls.errorCode} is null`
  const callFailureCondition = sql`not (${callSuccessCondition})`
  const successExpr = sql<number>`count(*) filter (where ${callSuccessCondition})`
  const failureExpr = sql<number>`count(*) filter (where ${callFailureCondition})`
  const creditsSpentExpr = sql<number>`coalesce(sum(${apiCalls.creditsCost}), 0)`
  const dayBucketExpr = sql<Date>`date_trunc('day', ${apiCalls.createdAt} at time zone 'Asia/Shanghai')`

  const [
    balanceRows,
    summaryRows,
    last24hRows,
    trendRows,
    keyRows
  ] = await Promise.all([
    db.select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select({
      total: totalExpr,
      success: successExpr,
      failure: failureExpr,
      totalSpent: creditsSpentExpr
    }).from(apiCalls).where(eq(apiCalls.userId, userId)),
    db.select({
      requests: totalExpr,
      spent: creditsSpentExpr
    }).from(apiCalls).where(and(
      eq(apiCalls.userId, userId),
      gte(apiCalls.createdAt, since24h)
    )),
    db.select({
      bucket: dayBucketExpr,
      totalCalls: totalExpr,
      creditsSpent: creditsSpentExpr
    }).from(apiCalls)
      .where(and(
        eq(apiCalls.userId, userId),
        gte(apiCalls.createdAt, rangeStart),
        sql`${apiCalls.createdAt} < ${tomorrowStart}`
      ))
      .groupBy(dayBucketExpr)
      .orderBy(asc(dayBucketExpr)),
    db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`count(*) filter (where ${apiKeys.isActive})`
    }).from(apiKeys).where(eq(apiKeys.userId, userId))
  ])

  const balance = toNumber(balanceRows[0]?.credits)
  const summary = summaryRows[0] || { total: 0, success: 0, failure: 0, totalSpent: 0 }
  const last24h = last24hRows[0] || { requests: 0, spent: 0 }
  const keyAgg = keyRows[0] || { total: 0, active: 0 }

  const total = toNumber(summary.total)
  const success = toNumber(summary.success)
  const failure = toNumber(summary.failure)
  const totalSpent = toNumber(summary.totalSpent)
  const successRate = total ? Number(((success / total) * 100).toFixed(2)) : 0

  const trendMap = new Map<string, UserDashboardTrendPoint>()
  for (const row of trendRows) {
    const key = toLocalDateKey(row.bucket)
    trendMap.set(key, {
      date: key,
      totalCalls: toNumber(row.totalCalls),
      creditsSpent: toNumber(row.creditsSpent)
    })
  }
  const trend: UserDashboardTrendPoint[] = Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = addLocalDays(rangeStart, index)
    const key = toLocalDateKey(date)
    return trendMap.get(key) || { date: key, totalCalls: 0, creditsSpent: 0 }
  })

  return {
    credits: {
      balance,
      totalSpent,
      spent24h: toNumber(last24h.spent)
    },
    calls: {
      total,
      success,
      failure,
      successRate,
      requests24h: toNumber(last24h.requests)
    },
    apiKeys: {
      total: toNumber(keyAgg.total),
      active: toNumber(keyAgg.active)
    },
    trend,
    generatedAt: new Date().toISOString()
  }
})
