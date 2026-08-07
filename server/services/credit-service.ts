import { and, asc, count, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { apis, creditTransactions, users } from '~~/server/db/schema'
import { normalizeCreditAmount } from './credit-adjustments'
import { getSqlState } from '~~/server/utils/database-error'
import { APP_TIME_ZONE, addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { decryptStoredSecret } from '~~/server/utils/stored-secret'
import type { CreditReason } from '#shared/types/credit-reason'
import type { UserCreditConsumptionDailyRow, UserCreditSummary } from '#shared/types/user-credits'

export type { CreditReason }

interface ChargeInput {
  userId: number
  amount: number
  apiId?: number | null
  apiCallId?: number | null
  remark?: string | null
  meta?: Record<string, unknown> | null
}

interface ListUserTransactionsFilters {
  reason?: CreditReason
  direction?: 'in' | 'out'
  limit?: number
  offset?: number
}

async function forceCharge(input: ChargeInput) {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) return { charged: 0, balanceAfter: null }

  try {
    return await db.transaction(async (tx: DatabaseTransaction) => {
      const updated = await tx.update(users)
        .set({ credits: sql`${users.credits} - ${amount}`, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, credits: users.credits })
      if (!updated[0]) return { charged: 0, balanceAfter: null }

      const balanceAfter = toNumber(updated[0].credits)
      await tx.insert(creditTransactions).values({
        userId: input.userId,
        amount: -amount,
        balanceAfter,
        reason: 'api_charge',
        apiId: input.apiId ?? null,
        apiCallId: input.apiCallId ?? null,
        remark: input.remark ?? null,
        meta: input.meta ?? null
      })
      return { charged: amount, balanceAfter }
    })
  } catch (error) {
    if (input.apiCallId === null || input.apiCallId === undefined || getSqlState(error) !== '23505') {
      throw error
    }

    const existing = await db.select({
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter
    }).from(creditTransactions)
      .where(and(
        eq(creditTransactions.apiCallId, input.apiCallId),
        eq(creditTransactions.reason, 'api_charge')
      ))
      .limit(1)
    if (!existing[0]) throw error

    return {
      charged: Math.max(-toNumber(existing[0].amount), 0),
      balanceAfter: toNumber(existing[0].balanceAfter)
    }
  }
}

async function getBalance(userId: number): Promise<number> {
  const rows = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1)
  return toNumber(rows[0]?.credits)
}

async function listUserTransactions(userId: number, filters: ListUserTransactionsFilters = {}) {
  const conditions: SQL[] = [eq(creditTransactions.userId, userId)]
  if (filters.reason) conditions.push(eq(creditTransactions.reason, filters.reason))
  if (filters.direction === 'in') conditions.push(sql`${creditTransactions.amount} > 0`)
  else if (filters.direction === 'out') conditions.push(sql`${creditTransactions.amount} < 0`)
  const { limit, offset } = normalizePagination(filters)
  const where = and(...conditions)

  const [items, totalRows] = await Promise.all([
    db.select({
      id: creditTransactions.id,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
      reason: creditTransactions.reason,
      apiId: creditTransactions.apiId,
      apiName: apis.name,
      apiPath: apis.apiPath,
      apiCallId: creditTransactions.apiCallId,
      codeId: creditTransactions.codeId,
      meta: creditTransactions.meta,
      operatorName: creditTransactions.operatorName,
      remark: creditTransactions.remark,
      createdAt: creditTransactions.createdAt
    }).from(creditTransactions)
      .leftJoin(apis, eq(apis.id, creditTransactions.apiId))
      .where(where)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(creditTransactions).where(where)
  ])

  return {
    items: items.map(({ meta, ...item }) => {
      const ciphertext = typeof meta?.codeCiphertext === 'string' ? meta.codeCiphertext : null
      const preview = typeof meta?.codePreview === 'string' ? meta.codePreview : null
      return {
        ...item,
        code: ciphertext ? decryptStoredSecret(ciphertext, 'redemption-code') : preview
      }
    }),
    total: toNumber(totalRows[0]?.value)
  }
}

async function getUserCreditsSummary(userId: number): Promise<UserCreditSummary> {
  const consumptionDays = 7
  const todayStart = getLocalDayStart()
  const rangeStart = addLocalDays(todayStart, -(consumptionDays - 1))
  const tomorrowStart = addLocalDays(todayStart, 1)
  const consumptionSource = db.select({
    bucket: sql<Date>`date_trunc('day', ${creditTransactions.createdAt} at time zone ${APP_TIME_ZONE})`.as('bucket'),
    amount: creditTransactions.amount
  }).from(creditTransactions)
    .where(and(
      eq(creditTransactions.userId, userId),
      lt(creditTransactions.amount, 0),
      gte(creditTransactions.createdAt, rangeStart),
      lt(creditTransactions.createdAt, tomorrowStart)
    ))
    .as('consumption_source')

  const [balanceRows, aggregateRows, reasonRows, consumptionRows] = await Promise.all([
    db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1),
    db.select({
      totalIn: sql<number>`coalesce(sum(case when ${creditTransactions.amount} > 0 then ${creditTransactions.amount} else 0 end), 0)`,
      totalOut: sql<number>`coalesce(sum(case when ${creditTransactions.amount} < 0 then -${creditTransactions.amount} else 0 end), 0)`,
      totalCount: sql<number>`count(*)`
    }).from(creditTransactions).where(eq(creditTransactions.userId, userId)),
    db.select({
      reason: creditTransactions.reason,
      count: sql<number>`count(*)`,
      sum: sql<number>`coalesce(sum(${creditTransactions.amount}), 0)`
    }).from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .groupBy(creditTransactions.reason),
    db.select({
      bucket: consumptionSource.bucket,
      consumedCredits: sql<number>`coalesce(sum(-${consumptionSource.amount}), 0)`,
      transactionCount: sql<number>`count(*)`
    }).from(consumptionSource)
      .groupBy(consumptionSource.bucket)
      .orderBy(asc(consumptionSource.bucket))
  ])

  const aggregate = aggregateRows[0] || { totalIn: 0, totalOut: 0, totalCount: 0 }
  const consumptionMap = new Map<string, UserCreditConsumptionDailyRow>()
  for (const row of consumptionRows) {
    const date = toLocalDateKey(row.bucket)
    consumptionMap.set(date, {
      date,
      consumedCredits: toNumber(row.consumedCredits),
      transactionCount: toNumber(row.transactionCount)
    })
  }

  return {
    balance: toNumber(balanceRows[0]?.credits),
    totalIn: toNumber(aggregate.totalIn),
    totalOut: toNumber(aggregate.totalOut),
    totalCount: toNumber(aggregate.totalCount),
    byReason: reasonRows.map(row => ({
      reason: row.reason,
      count: toNumber(row.count),
      sum: toNumber(row.sum)
    })),
    consumptionLast7Days: Array.from({ length: consumptionDays }, (_, index) => {
      const date = toLocalDateKey(addLocalDays(rangeStart, index))
      return consumptionMap.get(date) ?? { date, consumedCredits: 0, transactionCount: 0 }
    })
  }
}

export const creditService = {
  forceCharge,
  getBalance,
  listUserTransactions,
  getUserCreditsSummary
}
