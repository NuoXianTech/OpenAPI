import { and, count, desc, eq, getTableColumns, gt, gte, ilike, lt, lte, sql, type SQL } from 'drizzle-orm'
import { apiCreditReservations, creditTransactions, users } from '~~/server/db/schema'
import { db, type DatabaseTransaction } from '~~/server/db/client'
import { createApplicationError } from '~~/server/errors/application-error'
import {
  getAdminCreditReason,
  normalizeCreditAmount,
  type AdminCreditOperation
} from './credit-adjustments'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import type { CreditReason } from '#shared/types/credit-reason'

interface AdminBatchAdjustInput {
  userIds: number[]
  operation: AdminCreditOperation
  amount: number
  operatorId?: number | null
  operatorName?: string | null
  remark?: string | null
}

interface AdminAdjustmentInput {
  userId: number
  amount: number
  reason: CreditReason
  operatorId?: number | null
  operatorName?: string | null
  remark?: string | null
}

interface AdminResetInput extends AdminAdjustmentInput {
  targetValue?: number
}

interface ListTransactionsFilters {
  userId?: number
  reason?: CreditReason
  direction?: 'in' | 'out'
  operatorName?: string
  startAt?: Date
  endAt?: Date
  minAmount?: number
  maxAmount?: number
  limit?: number
  offset?: number
}

interface CreditOperationResult {
  userId: number
  balanceAfter: number
}

function requirePositiveAmount(amount: number): number {
  const normalized = normalizeCreditAmount(amount)
  if (normalized > 0) return normalized
  throw createApplicationError({ statusCode: 400, message: 'amount must be > 0' })
}

async function getReservedCredits(tx: DatabaseTransaction, userId: number): Promise<number> {
  const rows = await tx.select({
    amount: sql<number>`coalesce(sum(${apiCreditReservations.amount}), 0)`
  }).from(apiCreditReservations).where(eq(apiCreditReservations.userId, userId))
  return toNumber(rows[0]?.amount)
}

async function grant(tx: DatabaseTransaction, input: AdminAdjustmentInput): Promise<CreditOperationResult | null> {
  const amount = requirePositiveAmount(input.amount)
  const updated = await tx.update(users)
    .set({ credits: sql`${users.credits} + ${amount}`, updatedAt: new Date() })
    .where(eq(users.id, input.userId))
    .returning({ id: users.id, credits: users.credits })
  if (!updated[0]) return null

  const balanceAfter = toNumber(updated[0].credits)
  await tx.insert(creditTransactions).values({
    userId: input.userId,
    amount,
    balanceAfter,
    reason: input.reason,
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    remark: input.remark ?? null
  })
  return { userId: input.userId, balanceAfter }
}

async function revoke(tx: DatabaseTransaction, input: AdminAdjustmentInput): Promise<CreditOperationResult | null> {
  const amount = requirePositiveAmount(input.amount)
  const current = await tx.select({ credits: users.credits }).from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
    .for('update')
  if (!current[0]) return null

  const currentCredits = toNumber(current[0].credits)
  const reservedCredits = await getReservedCredits(tx, input.userId)
  const deductedAmount = Math.min(Math.max(currentCredits - reservedCredits, 0), amount)
  const balanceAfter = currentCredits - deductedAmount
  if (deductedAmount > 0) {
    await tx.update(users)
      .set({ credits: balanceAfter, updatedAt: new Date() })
      .where(eq(users.id, input.userId))
  }
  await tx.insert(creditTransactions).values({
    userId: input.userId,
    amount: deductedAmount === 0 ? 0 : -deductedAmount,
    balanceAfter,
    reason: input.reason,
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    remark: input.remark ?? (deductedAmount === 0 ? '可用积分不足，未实际扣减' : null)
  })
  return { userId: input.userId, balanceAfter }
}

async function reset(tx: DatabaseTransaction, input: AdminResetInput): Promise<CreditOperationResult | null> {
  const target = normalizeCreditAmount(input.targetValue ?? 0)
  const current = await tx.select({ credits: users.credits }).from(users)
    .where(eq(users.id, input.userId))
    .limit(1)
    .for('update')
  if (!current[0]) return null

  const reservedCredits = await getReservedCredits(tx, input.userId)
  if (target < reservedCredits) {
    throw createApplicationError({
      statusCode: 409,
      message: `cannot reset credits below reserved balance (${reservedCredits})`
    })
  }

  const updated = await tx.update(users)
    .set({ credits: target, updatedAt: new Date() })
    .where(eq(users.id, input.userId))
    .returning({ credits: users.credits })
  const balanceAfter = toNumber(updated[0]?.credits)
  await tx.insert(creditTransactions).values({
    userId: input.userId,
    amount: target - toNumber(current[0].credits),
    balanceAfter,
    reason: input.reason,
    operatorId: input.operatorId ?? null,
    operatorName: input.operatorName ?? null,
    remark: input.remark ?? `重置为 ${target}`
  })
  return { userId: input.userId, balanceAfter }
}

async function applyOperation(
  tx: DatabaseTransaction,
  input: AdminBatchAdjustInput & { userId: number }
): Promise<CreditOperationResult | null> {
  const commonInput = {
    userId: input.userId,
    amount: input.amount,
    reason: getAdminCreditReason(input.operation),
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    remark: input.remark
  }
  if (input.operation === 'grant') return grant(tx, commonInput)
  if (input.operation === 'revoke') return revoke(tx, commonInput)
  return reset(tx, { ...commonInput, targetValue: input.amount })
}

export const adminCreditService = {
  async batchAdjust(input: AdminBatchAdjustInput) {
    return db.transaction(async (tx: DatabaseTransaction) => {
      const results: CreditOperationResult[] = []
      for (const userId of new Set(input.userIds)) {
        const result = await applyOperation(tx, { ...input, userId })
        if (!result) {
          throw createApplicationError({ statusCode: 404, message: `user ${userId} not found` })
        }
        results.push(result)
      }
      return { affected: results.length, results }
    })
  },

  async listTransactions(filters: ListTransactionsFilters = {}) {
    const conditions: SQL[] = []
    if (typeof filters.userId === 'number') conditions.push(eq(creditTransactions.userId, filters.userId))
    if (filters.reason) conditions.push(eq(creditTransactions.reason, filters.reason))
    if (filters.direction === 'in') conditions.push(gt(creditTransactions.amount, 0))
    if (filters.direction === 'out') conditions.push(lt(creditTransactions.amount, 0))
    if (filters.operatorName) conditions.push(ilike(creditTransactions.operatorName, `%${filters.operatorName}%`))
    if (filters.startAt) conditions.push(gte(creditTransactions.createdAt, filters.startAt))
    if (filters.endAt) conditions.push(lte(creditTransactions.createdAt, filters.endAt))
    if (typeof filters.minAmount === 'number') conditions.push(gte(creditTransactions.amount, filters.minAmount))
    if (typeof filters.maxAmount === 'number') conditions.push(lte(creditTransactions.amount, filters.maxAmount))
    const { limit, offset } = normalizePagination(filters)
    const where = conditions.length ? and(...conditions) : undefined
    const transactionColumns = getTableColumns(creditTransactions)
    const [items, totalRows] = await Promise.all([
      db.select({ ...transactionColumns, userName: users.username, userRole: users.role })
        .from(creditTransactions)
        .leftJoin(users, eq(users.id, creditTransactions.userId))
        .where(where)
        .orderBy(desc(creditTransactions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(creditTransactions).where(where)
    ])
    return { items, total: toNumber(totalRows[0]?.value) }
  }
}
