import { and, asc, eq, gte, lt, sql } from 'drizzle-orm'
import { apiCalls, apiKeys, users } from '~~/server/db/schema'
import { db } from '~~/server/db/client'
import { APP_TIME_ZONE, addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { toNumber } from '~~/server/utils/number'
import type { UserDashboardData, UserDashboardHourlyPoint, UserDashboardTrendPoint } from '#shared/types/user-dashboard'

const TREND_DAYS = 7
const HOURLY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

export const userDashboardService = {
  async getDashboard(userId: number): Promise<UserDashboardData> {
    const now = new Date()
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const todayStart = getLocalDayStart(now)
    const rangeStart = addLocalDays(todayStart, -(TREND_DAYS - 1))
    const tomorrowStart = addLocalDays(todayStart, 1)
    const countedCondition = sql`${apiCalls.isCounted} = true`
    const httpSuccessCondition = sql`${apiCalls.statusCode} >= 200 and ${apiCalls.statusCode} < 400 and ${apiCalls.errorCode} is null`
    const successCondition = sql`${countedCondition} and ${httpSuccessCondition}`
    const failureCondition = sql`${countedCondition} and not (${httpSuccessCondition})`
    const totalExpr = sql<number>`count(*) filter (where ${countedCondition})`
    const successExpr = sql<number>`count(*) filter (where ${successCondition})`
    const failureExpr = sql<number>`count(*) filter (where ${failureCondition})`
    const creditsSpentExpr = sql<number>`coalesce(sum(${apiCalls.creditsCost}), 0)`

    const hourlySource = db.select({
      bucket: sql<Date>`date_trunc('hour', ${apiCalls.createdAt})`.as('bucket'),
      statusCode: apiCalls.statusCode,
      errorCode: apiCalls.errorCode
    }).from(apiCalls)
      .where(and(
        eq(apiCalls.userId, userId),
        eq(apiCalls.isCounted, true),
        gte(apiCalls.createdAt, since24h)
      ))
      .as('hourly_source')

    // Keep the timezone expression in one subquery column. Repeating a parameterized
    // date_trunc fragment across select/group/order can produce distinct placeholders.
    const trendSource = db.select({
      bucket: sql<Date>`date_trunc('day', ${apiCalls.createdAt} at time zone ${APP_TIME_ZONE})`.as('bucket'),
      isCounted: apiCalls.isCounted,
      creditsCost: apiCalls.creditsCost
    }).from(apiCalls)
      .where(and(
        eq(apiCalls.userId, userId),
        gte(apiCalls.createdAt, rangeStart),
        lt(apiCalls.createdAt, tomorrowStart)
      ))
      .as('trend_source')

    const [balanceRows, summaryRows, last24hRows, trendRows, hourlyRows, keyRows] = await Promise.all([
      db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1),
      db.select({
        total: totalExpr,
        success: successExpr,
        failure: failureExpr,
        totalSpent: creditsSpentExpr
      }).from(apiCalls).where(eq(apiCalls.userId, userId)),
      db.select({ requests: totalExpr, spent: creditsSpentExpr }).from(apiCalls).where(and(
        eq(apiCalls.userId, userId),
        gte(apiCalls.createdAt, since24h)
      )),
      db.select({
        bucket: trendSource.bucket,
        totalCalls: sql<number>`count(*) filter (where ${trendSource.isCounted} = true)`,
        creditsSpent: sql<number>`coalesce(sum(${trendSource.creditsCost}), 0)`
      }).from(trendSource)
        .groupBy(trendSource.bucket)
        .orderBy(asc(trendSource.bucket)),
      db.select({
        bucket: hourlySource.bucket,
        successCalls: sql<number>`count(*) filter (where ${hourlySource.statusCode} >= 200 and ${hourlySource.statusCode} < 400 and ${hourlySource.errorCode} is null)`,
        failureCalls: sql<number>`count(*) filter (where not (${hourlySource.statusCode} >= 200 and ${hourlySource.statusCode} < 400 and ${hourlySource.errorCode} is null))`
      }).from(hourlySource)
        .groupBy(hourlySource.bucket)
        .orderBy(asc(hourlySource.bucket)),
      db.select({
        total: sql<number>`count(*)`,
        active: sql<number>`count(*) filter (where ${apiKeys.isActive})`
      }).from(apiKeys).where(eq(apiKeys.userId, userId))
    ])

    const summary = summaryRows[0] || { total: 0, success: 0, failure: 0, totalSpent: 0 }
    const last24h = last24hRows[0] || { requests: 0, spent: 0 }
    const keyAggregate = keyRows[0] || { total: 0, active: 0 }
    const total = toNumber(summary.total)
    const success = toNumber(summary.success)
    const failure = toNumber(summary.failure)
    const trendMap = new Map<string, UserDashboardTrendPoint>()
    for (const row of trendRows) {
      const key = toLocalDateKey(row.bucket)
      trendMap.set(key, {
        date: key,
        totalCalls: toNumber(row.totalCalls),
        creditsSpent: toNumber(row.creditsSpent)
      })
    }
    const trend = Array.from({ length: TREND_DAYS }, (_, index): UserDashboardTrendPoint => {
      const key = toLocalDateKey(addLocalDays(rangeStart, index))
      return trendMap.get(key) || { date: key, totalCalls: 0, creditsSpent: 0 }
    })

    const hourlyMap = new Map<string, Pick<UserDashboardHourlyPoint, 'successCalls' | 'failureCalls'>>()
    for (const row of hourlyRows) {
      const date = row.bucket instanceof Date ? row.bucket : new Date(row.bucket)
      hourlyMap.set(date.toISOString(), {
        successCalls: toNumber(row.successCalls),
        failureCalls: toNumber(row.failureCalls)
      })
    }
    const nowHour = new Date(now)
    nowHour.setMinutes(0, 0, 0)
    const hourlyTrend24h: UserDashboardHourlyPoint[] = Array.from({ length: 24 }, (_, index) => {
      const date = new Date(nowHour.getTime() - (23 - index) * 60 * 60 * 1000)
      const hour = date.toISOString()
      return {
        hour,
        label: HOURLY_LABEL_FORMATTER.format(date),
        ...(hourlyMap.get(hour) || { successCalls: 0, failureCalls: 0 })
      }
    })

    return {
      credits: {
        balance: toNumber(balanceRows[0]?.credits),
        totalSpent: toNumber(summary.totalSpent),
        spent24h: toNumber(last24h.spent)
      },
      calls: {
        total,
        success,
        failure,
        successRate: total ? Number(((success / total) * 100).toFixed(2)) : 0,
        requests24h: toNumber(last24h.requests)
      },
      apiKeys: {
        total: toNumber(keyAggregate.total),
        active: toNumber(keyAggregate.active)
      },
      trend,
      hourlyTrend24h,
      generatedAt: new Date().toISOString()
    }
  }
}
