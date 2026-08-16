import { and, count, desc, eq, gt, gte, ilike, lt, or, sql, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { creditTransactions, redemptionCodes, users } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type { AdminCreditOverview } from '#shared/types/admin-credits'

export type AdminCreditBalanceFilter = 'all' | 'positive' | 'zero' | 'negative'

interface AdminCreditUserFilters {
  keyword?: string
  userId?: number
  balance?: AdminCreditBalanceFilter
  limit?: number
  offset?: number
}

async function getOverview(): Promise<AdminCreditOverview> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const activeCodeCondition = sql`${redemptionCodes.isEnabled} = true
    and ${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}
    and (${redemptionCodes.expiresAt} is null or ${redemptionCodes.expiresAt} > now())`

  const [balanceRows, activityRows, redemptionRows, recentTransactions] = await Promise.all([
    db.select({
      totalBalance: sql<number>`coalesce(sum(${users.credits}), 0)`,
      userCount: count(),
      usersWithBalance: sql<number>`count(*) filter (where ${users.credits} > 0)`
    }).from(users),
    db.select({
      income: sql<number>`coalesce(sum(case when ${creditTransactions.amount} > 0 then ${creditTransactions.amount} else 0 end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${creditTransactions.amount} < 0 then abs(${creditTransactions.amount}) else 0 end), 0)`,
      transactionCount: count()
    }).from(creditTransactions).where(gte(creditTransactions.createdAt, since)),
    db.select({
      activeCodes: sql<number>`count(*) filter (where ${activeCodeCondition})`,
      potentialCredits: sql<number>`coalesce(sum(case when ${activeCodeCondition}
        then ${redemptionCodes.amount} * (${redemptionCodes.maxUses} - ${redemptionCodes.usedCount})
        else 0 end), 0)`
    }).from(redemptionCodes),
    db.select({
      id: creditTransactions.id,
      userId: creditTransactions.userId,
      userName: users.username,
      userRole: users.role,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
      reason: creditTransactions.reason,
      operatorName: creditTransactions.operatorName,
      remark: creditTransactions.remark,
      createdAt: creditTransactions.createdAt
    })
      .from(creditTransactions)
      .leftJoin(users, eq(users.id, creditTransactions.userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(8)
  ])

  const balance = balanceRows[0]
  const activity = activityRows[0]
  const redemption = redemptionRows[0]
  const totalBalance = toNumber(balance?.totalBalance)
  const userCount = toNumber(balance?.userCount)
  const income24h = toNumber(activity?.income)
  const expense24h = toNumber(activity?.expense)

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalBalance,
      userCount,
      usersWithBalance: toNumber(balance?.usersWithBalance),
      averageBalance: userCount > 0 ? Math.round(totalBalance / userCount) : 0,
      income24h,
      expense24h,
      netChange24h: income24h - expense24h,
      transactionCount24h: toNumber(activity?.transactionCount),
      activeRedemptionCodes: toNumber(redemption?.activeCodes),
      redemptionPotential: toNumber(redemption?.potentialCredits)
    },
    recentTransactions: recentTransactions.map(item => ({
      ...item,
      createdAt: item.createdAt.toISOString()
    }))
  }
}

async function listUsers(filters: AdminCreditUserFilters = {}) {
  const conditions: SQL[] = []
  const keyword = filters.keyword?.trim()

  if (keyword) {
    conditions.push(or(
      ilike(users.username, `%${keyword}%`),
      ilike(users.email, `%${keyword}%`),
      ilike(users.displayName, `%${keyword}%`)
    )!)
  }
  if (filters.userId) conditions.push(eq(users.id, filters.userId))
  if (filters.balance === 'positive') conditions.push(gt(users.credits, 0))
  if (filters.balance === 'zero') conditions.push(eq(users.credits, 0))
  if (filters.balance === 'negative') conditions.push(lt(users.credits, 0))

  const where = conditions.length ? and(...conditions) : undefined
  const { limit, offset } = normalizePagination(filters, { defaultLimit: 20 })
  const [items, totalRows] = await Promise.all([
    db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      displayName: users.displayName,
      email: users.email,
      credits: users.credits,
      isActive: users.isActive,
      isBanned: users.isBanned,
      createdAt: users.createdAt
    })
      .from(users)
      .where(where)
      .orderBy(desc(users.credits), desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(users).where(where)
  ])

  return {
    items: items.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
    total: toNumber(totalRows[0]?.value)
  }
}

export const adminCreditReportService = {
  getOverview,
  listUsers
}
