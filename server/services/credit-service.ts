import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { apiCalls, apiCreditReservations, apiKeys, apis, creditTransactions, users } from '~~/server/db/schema'
import { normalizeCreditAmount } from './credit-adjustments'
import { APP_TIME_ZONE, addLocalDays, getLocalDayStart, toLocalDateKey } from '~~/server/utils/local-time'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { firstRow } from '~~/server/utils/row'
import { decryptStoredSecret } from '~~/server/utils/stored-secret'
import type { CreditReason } from '#shared/types/credit-reason'
import type { UserCreditConsumptionDailyRow, UserCreditSummary } from '#shared/types/user-credits'

export type { CreditReason }

interface ReserveInput {
  userId: number
  apiKeyId: number
  apiId: number
  requestId: string
  amount: number
}

interface FinalizeReservationInput {
  reservationId: number
  apiCallId?: number | null
  remark?: string | null
}

interface ListUserTransactionsFilters {
  reason?: CreditReason
  direction?: 'in' | 'out'
  limit?: number
  offset?: number
}

const RESERVATION_RETRY_DELAY_MS = 60_000
const RESERVATION_MAX_ATTEMPTS = 5
const BACKOFF_SECONDS_SCHEDULE = [30, 60, 120, 300, 600]

function nextAttemptAt(attempts: number): Date {
  const index = Math.min(Math.max(attempts, 0), BACKOFF_SECONDS_SCHEDULE.length - 1)
  return new Date(Date.now() + BACKOFF_SECONDS_SCHEDULE[index]! * 1000)
}

async function reserve(input: ReserveInput) {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) return { status: 'insufficient_credits' as const }

  return db.transaction(async (tx: DatabaseTransaction) => {
    const userRows = await tx.select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1)
      .for('update')
    const user = userRows[0]
    if (!user) return { status: 'insufficient_credits' as const }

    const reservedRows = await tx.select({
      amount: sql<number>`coalesce(sum(${apiCreditReservations.amount}), 0)`
    }).from(apiCreditReservations).where(eq(apiCreditReservations.userId, input.userId))
    const reservedAmount = toNumber(reservedRows[0]?.amount)
    if (toNumber(user.credits) - reservedAmount < amount) {
      return { status: 'insufficient_credits' as const }
    }

    const quotaRows = await tx.update(apiKeys)
      .set({
        usedCredits: sql`${apiKeys.usedCredits} + ${amount}`,
        updatedAt: new Date()
      })
      .where(and(
        eq(apiKeys.id, input.apiKeyId),
        eq(apiKeys.userId, input.userId),
        eq(apiKeys.isActive, true),
        or(
          isNull(apiKeys.totalQuota),
          sql`${apiKeys.usedCredits} + ${amount} <= ${apiKeys.totalQuota}`
        )!
      ))
      .returning({ id: apiKeys.id })
    if (!quotaRows[0]) return { status: 'api_key_quota_exceeded' as const }

    const rows = await tx.insert(apiCreditReservations).values({
      userId: input.userId,
      apiKeyId: input.apiKeyId,
      apiId: input.apiId,
      requestId: input.requestId,
      amount
    }).returning({
      id: apiCreditReservations.id,
      userId: apiCreditReservations.userId,
      amount: apiCreditReservations.amount
    })
    return { status: 'reserved' as const, reservation: firstRow(rows)! }
  })
}

async function releaseReservation(reservationId: number, userId?: number) {
  return db.transaction(async (tx: DatabaseTransaction) => {
    const conditions = [
      eq(apiCreditReservations.id, reservationId),
      inArray(apiCreditReservations.status, ['active', 'pending'])
    ]
    if (userId !== undefined) conditions.push(eq(apiCreditReservations.userId, userId))
    const rows = await tx.select({
      id: apiCreditReservations.id,
      apiKeyId: apiCreditReservations.apiKeyId,
      amount: apiCreditReservations.amount
    }).from(apiCreditReservations)
      .where(and(...conditions))
      .limit(1)
      .for('update')
    const reservation = rows[0]
    if (!reservation) return false

    await tx.update(apiKeys).set({
      usedCredits: sql`greatest(${apiKeys.usedCredits} - ${reservation.amount}, 0)`,
      updatedAt: new Date()
    }).where(eq(apiKeys.id, reservation.apiKeyId))
    await tx.delete(apiCreditReservations).where(eq(apiCreditReservations.id, reservation.id))
    return true
  })
}

async function markReservationPending(reservationId: number, userId: number) {
  const rows = await db.update(apiCreditReservations).set({
    status: 'pending',
    nextAttemptAt: new Date(Date.now() + RESERVATION_RETRY_DELAY_MS),
    updatedAt: new Date()
  }).where(and(
    eq(apiCreditReservations.id, reservationId),
    eq(apiCreditReservations.userId, userId),
    eq(apiCreditReservations.status, 'active')
  )).returning({ id: apiCreditReservations.id })
  return Boolean(rows[0])
}

async function linkApiCall(reservationId: number, apiCallId: number) {
  await db.update(apiCreditReservations).set({ apiCallId, updatedAt: new Date() }).where(and(
    eq(apiCreditReservations.id, reservationId),
    eq(apiCreditReservations.status, 'pending')
  ))
}

async function finalizeReservation(input: FinalizeReservationInput) {
  return db.transaction(async (tx: DatabaseTransaction) => {
    const existingRows = await tx.select({
      id: creditTransactions.id,
      amount: creditTransactions.amount,
      balanceAfter: creditTransactions.balanceAfter,
      apiCallId: creditTransactions.apiCallId
    }).from(creditTransactions)
      .where(eq(creditTransactions.creditReservationId, input.reservationId))
      .limit(1)
    const existing = existingRows[0]
    if (existing) {
      const apiCallId = existing.apiCallId ?? input.apiCallId ?? null
      if (apiCallId && existing.apiCallId === null) {
        await tx.update(creditTransactions)
          .set({ apiCallId })
          .where(and(eq(creditTransactions.id, existing.id), isNull(creditTransactions.apiCallId)))
      }
      if (apiCallId) {
        await tx.update(apiCalls)
          .set({ creditsCost: Math.max(-toNumber(existing.amount), 0) })
          .where(eq(apiCalls.id, apiCallId))
      }
      await tx.delete(apiCreditReservations).where(eq(apiCreditReservations.id, input.reservationId))
      return {
        charged: Math.max(-toNumber(existing.amount), 0),
        balanceAfter: toNumber(existing.balanceAfter)
      }
    }

    const reservations = await tx.select({
      userId: apiCreditReservations.userId,
      apiId: apiCreditReservations.apiId,
      apiCallId: apiCreditReservations.apiCallId,
      requestId: apiCreditReservations.requestId,
      amount: apiCreditReservations.amount
    })
      .from(apiCreditReservations)
      .where(and(
        eq(apiCreditReservations.id, input.reservationId),
        eq(apiCreditReservations.status, 'pending')
      ))
      .limit(1)
      .for('update')
    const reservation = reservations[0]
    if (!reservation) throw new Error('Credit reservation not found')

    const updated = await tx.update(users)
      .set({ credits: sql`${users.credits} - ${reservation.amount}`, updatedAt: new Date() })
      .where(and(eq(users.id, reservation.userId), gte(users.credits, reservation.amount)))
      .returning({ credits: users.credits })
    if (!updated[0]) throw new Error('Reserved credit balance is no longer available')

    const balanceAfter = toNumber(updated[0].credits)
    const apiCallId = input.apiCallId ?? reservation.apiCallId ?? null
    await tx.insert(creditTransactions).values({
      userId: reservation.userId,
      amount: -reservation.amount,
      balanceAfter,
      reason: 'api_charge',
      apiId: reservation.apiId,
      apiCallId,
      creditReservationId: input.reservationId,
      remark: input.remark ?? null,
      meta: { requestId: reservation.requestId }
    })
    if (apiCallId) {
      await tx.update(apiCalls)
        .set({ creditsCost: reservation.amount })
        .where(eq(apiCalls.id, apiCallId))
    }
    await tx.delete(apiCreditReservations).where(eq(apiCreditReservations.id, input.reservationId))
    return { charged: reservation.amount, balanceAfter }
  })
}

async function claimDueReservations(limit: number) {
  const max = Math.max(Math.trunc(limit), 1)
  return db.select({
    id: apiCreditReservations.id,
    attempts: apiCreditReservations.attempts
  }).from(apiCreditReservations)
    .where(and(
      eq(apiCreditReservations.status, 'pending'),
      lte(apiCreditReservations.nextAttemptAt, new Date())
    ))
    .orderBy(asc(apiCreditReservations.nextAttemptAt))
    .limit(max)
}

async function markReservationAttempt(id: number, error: string) {
  return db.transaction(async (tx: DatabaseTransaction) => {
    const rows = await tx.select({ attempts: apiCreditReservations.attempts })
      .from(apiCreditReservations)
      .where(and(eq(apiCreditReservations.id, id), eq(apiCreditReservations.status, 'pending')))
      .limit(1)
      .for('update')
    if (!rows[0]) return

    const attempts = rows[0].attempts + 1
    await tx.update(apiCreditReservations).set({
      attempts,
      lastError: error.slice(0, 500),
      lastAttemptAt: new Date(),
      nextAttemptAt: nextAttemptAt(attempts),
      status: attempts >= RESERVATION_MAX_ATTEMPTS ? 'dead_letter' : 'pending',
      updatedAt: new Date()
    }).where(eq(apiCreditReservations.id, id))
  })
}

async function releaseExpiredReservations(cutoff: Date, limit = 100) {
  return db.transaction(async (tx: DatabaseTransaction) => {
    const rows = await tx.select({
      id: apiCreditReservations.id,
      apiKeyId: apiCreditReservations.apiKeyId,
      amount: apiCreditReservations.amount
    }).from(apiCreditReservations)
      .where(and(
        eq(apiCreditReservations.status, 'active'),
        lt(apiCreditReservations.createdAt, cutoff)
      ))
      .orderBy(asc(apiCreditReservations.createdAt))
      .limit(Math.max(Math.trunc(limit), 1))
      .for('update')
    if (rows.length === 0) return 0

    const releasedByApiKey = new Map<number, number>()
    for (const row of rows) {
      releasedByApiKey.set(row.apiKeyId, (releasedByApiKey.get(row.apiKeyId) ?? 0) + row.amount)
    }
    for (const [apiKeyId, amount] of releasedByApiKey) {
      await tx.update(apiKeys).set({
        usedCredits: sql`greatest(${apiKeys.usedCredits} - ${amount}, 0)`,
        updatedAt: new Date()
      }).where(eq(apiKeys.id, apiKeyId))
    }
    await tx.delete(apiCreditReservations).where(inArray(apiCreditReservations.id, rows.map(row => row.id)))
    return rows.length
  })
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
  reserve,
  releaseReservation,
  markReservationPending,
  linkApiCall,
  finalizeReservation,
  claimDueReservations,
  markReservationAttempt,
  releaseExpiredReservations,
  getBalance,
  listUserTransactions,
  getUserCreditsSummary
}
