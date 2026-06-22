import { and, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import { apis, creditTransactions, users } from '@nuxthub/db/schema'
import {
  calculateAdminRevokeAdjustment,
  getAdminCreditReason,
  normalizeCreditAmount,
  type AdminCreditOperation
} from '~~/server/service/creditAdjustments'
import { normalizePagination } from '~~/server/utils/pagination'
import type { CreditReason } from '~~/shared/types/credit-reason'

export type { CreditReason }

export interface ChargeInput {
  userId: number
  amount: number
  apiId?: number | null
  apiCallId?: number | null
  remark?: string | null
  meta?: Record<string, unknown> | null
}

export interface AdjustInput {
  userId: number
  amount: number
  reason: CreditReason
  operatorId?: number | null
  operatorName?: string | null
  remark?: string | null
  meta?: Record<string, unknown> | null
}

export interface AdminResetInput extends AdjustInput {
  targetValue?: number
}

export interface AdminBatchAdjustInput {
  userIds: number[]
  operation: AdminCreditOperation
  amount: number
  operatorId?: number | null
  operatorName?: string | null
  remark?: string | null
}

export interface CreditOperationResult {
  userId: number
  balanceAfter: number
}

export interface AdminBatchAdjustResult {
  affected: number
  results: CreditOperationResult[]
}

interface AdminOperationTransactionInput {
  userId: number
  operation: AdminCreditOperation
  amount: number
  operatorId?: number | null
  operatorName?: string | null
  remark?: string | null
}

export interface ListTransactionsFilters {
  userId?: number
  reason?: CreditReason
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

export interface ListUserTransactionsFilters {
  reason?: CreditReason
  direction?: 'in' | 'out'
  limit?: number
  offset?: number
}

export async function charge(input: ChargeInput) {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) return { charged: 0, balanceAfter: null }

  return db.transaction(async (tx: typeof db) => {
    const updated = await tx.update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date()
      })
      .where(and(eq(users.id, input.userId), gte(users.credits, amount)))
      .returning({ id: users.id, credits: users.credits })

    if (!updated[0]) {
      throw new Error('INSUFFICIENT_CREDITS')
    }

    const balanceAfter = Number(updated[0].credits)
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
}

export async function forceCharge(input: ChargeInput) {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) return { charged: 0, balanceAfter: null }

  return db.transaction(async (tx: typeof db) => {
    const updated = await tx.update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, input.userId))
      .returning({ id: users.id, credits: users.credits })

    if (!updated[0]) return { charged: 0, balanceAfter: null }

    const balanceAfter = Number(updated[0].credits)
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
}

export async function refund(input: ChargeInput) {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) return { refunded: 0, balanceAfter: null }

  return db.transaction(async (tx: typeof db) => {
    const updated = await tx.update(users)
      .set({
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, input.userId))
      .returning({ id: users.id, credits: users.credits })

    if (!updated[0]) return { refunded: 0, balanceAfter: null }

    const balanceAfter = Number(updated[0].credits)
    await tx.insert(creditTransactions).values({
      userId: input.userId,
      amount,
      balanceAfter,
      reason: 'api_refund',
      apiId: input.apiId ?? null,
      apiCallId: input.apiCallId ?? null,
      remark: input.remark ?? null,
      meta: input.meta ?? null
    })

    return { refunded: amount, balanceAfter }
  })
}

export async function adminGrant(input: AdjustInput): Promise<CreditOperationResult | null> {
  return db.transaction(async (tx: typeof db) => adminGrantWithTransaction(tx, input))
}

export async function adminRevoke(input: AdjustInput): Promise<CreditOperationResult | null> {
  return db.transaction(async (tx: typeof db) => adminRevokeWithTransaction(tx, input))
}

export async function adminReset(input: AdminResetInput): Promise<CreditOperationResult | null> {
  return db.transaction(async (tx: typeof db) => adminResetWithTransaction(tx, input))
}

export async function adminBatchAdjust(input: AdminBatchAdjustInput): Promise<AdminBatchAdjustResult> {
  return db.transaction(async (tx: typeof db) => {
    const targetIds = await resolveAdminBatchTargetIds(tx, input.userIds)
    const results: CreditOperationResult[] = []

    for (const userId of targetIds) {
      const result = await applyAdminOperationWithTransaction(tx, {
        userId,
        operation: input.operation,
        amount: input.amount,
        operatorId: input.operatorId,
        operatorName: input.operatorName,
        remark: input.remark
      })

      if (!result) {
        throw new Error(`USER_NOT_FOUND:${userId}`)
      }

      results.push(result)
    }

    return { affected: results.length, results }
  })
}

export async function getBalance(userId: number): Promise<number> {
  const rows = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1)
  return Number(rows[0]?.credits || 0)
}

export async function listBalances(userIds: number[]): Promise<Array<{ id: number, credits: number }>> {
  if (userIds.length === 0) return []
  const rows = await db.select({ id: users.id, credits: users.credits })
    .from(users)
    .where(inArray(users.id, userIds))
  return rows.map((row: { id: number, credits: number }) => ({ id: row.id, credits: Number(row.credits) }))
}

export async function listTransactions(filters: ListTransactionsFilters = {}) {
  const conditions: SQL[] = []
  if (typeof filters.userId === 'number') conditions.push(eq(creditTransactions.userId, filters.userId))
  if (filters.reason) conditions.push(eq(creditTransactions.reason, filters.reason))
  if (filters.startAt) conditions.push(gte(creditTransactions.createdAt, filters.startAt))
  if (filters.endAt) conditions.push(lte(creditTransactions.createdAt, filters.endAt))

  const { limit, offset } = normalizePagination(filters)

  const where = conditions.length ? and(...conditions) : undefined
  const [items, totalRows] = await Promise.all([
    where
      ? db.select().from(creditTransactions).where(where).orderBy(desc(creditTransactions.createdAt)).limit(limit).offset(offset)
      : db.select().from(creditTransactions).orderBy(desc(creditTransactions.createdAt)).limit(limit).offset(offset),
    where
      ? db.select({ value: count() }).from(creditTransactions).where(where)
      : db.select({ value: count() }).from(creditTransactions)
  ])

  return {
    items,
    total: Number(totalRows[0]?.value || 0)
  }
}

export async function listUserTransactions(
  userId: number,
  filters: ListUserTransactionsFilters = {}
) {
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
      code: sql<string | null>`${creditTransactions.meta}->>'code'`,
      operatorName: creditTransactions.operatorName,
      remark: creditTransactions.remark,
      createdAt: creditTransactions.createdAt
    })
      .from(creditTransactions)
      .leftJoin(apis, eq(apis.id, creditTransactions.apiId))
      .where(where)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(creditTransactions).where(where)
  ])

  return {
    items,
    total: Number(totalRows[0]?.value || 0)
  }
}

export async function getUserCreditsSummary(userId: number) {
  const [balanceRow, aggRows, reasonRows] = await Promise.all([
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
    })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .groupBy(creditTransactions.reason)
  ])

  const balance = Number(balanceRow[0]?.credits || 0)
  const agg = aggRows[0] || { totalIn: 0, totalOut: 0, totalCount: 0 }
  const byReason = reasonRows.map((row: { reason: string, count: number | string, sum: number | string }) => ({
    reason: row.reason,
    count: Number(row.count) || 0,
    sum: Number(row.sum) || 0
  }))

  return {
    balance,
    totalIn: Number(agg.totalIn) || 0,
    totalOut: Number(agg.totalOut) || 0,
    totalCount: Number(agg.totalCount) || 0,
    byReason
  }
}

async function adminGrantWithTransaction(
  tx: typeof db,
  input: AdjustInput
): Promise<CreditOperationResult | null> {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) throw new Error('amount must be > 0')

  const updated = await tx.update(users)
    .set({
      credits: sql`${users.credits} + ${amount}`,
      updatedAt: new Date()
    })
    .where(eq(users.id, input.userId))
    .returning({ id: users.id, credits: users.credits })

  if (!updated[0]) return null

  const balanceAfter = Number(updated[0].credits)
  await tx.insert(creditTransactions).values({
    userId: input.userId,
    amount,
    balanceAfter,
    reason: getAdminCreditReason('grant'),
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    remark: input.remark ?? null,
    meta: input.meta ?? null
  })

  return { userId: input.userId, balanceAfter }
}

async function adminRevokeWithTransaction(
  tx: typeof db,
  input: AdjustInput
): Promise<CreditOperationResult | null> {
  const amount = normalizeCreditAmount(input.amount)
  if (amount === 0) throw new Error('amount must be > 0')

  const current = await tx.select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
    .for('update')
  if (!current[0]) return null

  const adjustment = calculateAdminRevokeAdjustment({
    currentCredits: Number(current[0].credits),
    requestedAmount: amount
  })

  if (adjustment.deductedAmount > 0) {
    const updated = await tx.update(users)
      .set({
        credits: adjustment.balanceAfter,
        updatedAt: new Date()
      })
      .where(eq(users.id, input.userId))
      .returning({ credits: users.credits })

    if (!updated[0]) return null
  }

  await tx.insert(creditTransactions).values({
    userId: input.userId,
    amount: adjustment.transactionAmount,
    balanceAfter: adjustment.balanceAfter,
    reason: getAdminCreditReason('revoke'),
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    remark: input.remark ?? (adjustment.deductedAmount === 0 ? '积分不足，未实际扣减' : null),
    meta: input.meta ?? null
  })

  return { userId: input.userId, balanceAfter: adjustment.balanceAfter }
}

async function adminResetWithTransaction(
  tx: typeof db,
  input: AdminResetInput
): Promise<CreditOperationResult | null> {
  const target = normalizeCreditAmount(input.targetValue ?? 0)
  const current = await tx.select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
    .for('update')
  if (!current[0]) return null

  const before = Number(current[0].credits)
  const delta = target - before
  const updated = await tx.update(users)
    .set({
      credits: target,
      updatedAt: new Date()
    })
    .where(eq(users.id, input.userId))
    .returning({ credits: users.credits })

  const balanceAfter = Number(updated[0]?.credits || 0)
  await tx.insert(creditTransactions).values({
    userId: input.userId,
    amount: delta,
    balanceAfter,
    reason: getAdminCreditReason('reset'),
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    remark: input.remark ?? `重置为 ${target}`,
    meta: input.meta ?? null
  })

  return { userId: input.userId, balanceAfter }
}

async function resolveAdminBatchTargetIds(tx: typeof db, userIds: number[]): Promise<number[]> {
  if (userIds.length > 0) return userIds

  const rows = await tx.select({ id: users.id }).from(users)
  return rows.map((row: { id: number }) => row.id)
}

async function applyAdminOperationWithTransaction(
  tx: typeof db,
  input: AdminOperationTransactionInput
): Promise<CreditOperationResult | null> {
  const reason = getAdminCreditReason(input.operation)
  const commonInput = {
    userId: input.userId,
    amount: input.amount,
    reason,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    remark: input.remark
  }

  if (input.operation === 'grant') return adminGrantWithTransaction(tx, commonInput)
  if (input.operation === 'revoke') return adminRevokeWithTransaction(tx, commonInput)
  return adminResetWithTransaction(tx, { ...commonInput, targetValue: input.amount })
}

export const creditService = {
  charge,
  forceCharge,
  refund,
  adminGrant,
  adminRevoke,
  adminReset,
  adminBatchAdjust,
  getBalance,
  listBalances,
  listTransactions,
  listUserTransactions,
  getUserCreditsSummary
}
