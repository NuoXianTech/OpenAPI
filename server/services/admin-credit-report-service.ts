import { count, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '~~/server/db/client'
import { creditTransactions, redemptionCodes, users } from '~~/server/db/schema'
import { toNumber } from '~~/server/utils/number'
import type { AdminCreditOverview } from '#shared/types/admin-credits'

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

export const adminCreditReportService = {
  getOverview
}
