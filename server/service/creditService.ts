import { and, count, desc, eq, gte, inArray, lte, sql, type SQL } from 'drizzle-orm'
import { apis, creditTransactions, users } from '@nuxthub/db/schema'
import type { CreditReason } from '~~/shared/types/credit-reason'

/**
 * 积分服务 · 单源真理
 *
 * 所有对 users.credits 的写入都必须走本服务，以保证：
 *   1. 积分变动 ↔ credit_transactions 流水 1:1 同时落盘（事务）
 *   2. balanceAfter 快照值正确，便于审计
 *
 * 余额非负约束分两档：
 *   - charge / adminRevoke：扣款前校验，余额不足则拒绝或扣到 0，扣后恒 >= 0（前置可控扣费）
 *   - forceCharge：后付费兜底，调用已发生、上游成本已产生，必须记账，允许扣成负数；
 *     负余额由 api-gate 的 balance < effectiveCost 校验挡住后续调用，直到充值回正
 */

export type { CreditReason }

export interface ChargeInput {
  userId: number
  amount: number // 正数；表示要扣的额度
  apiId?: number | null
  apiCallId?: number | null
  remark?: string | null
  meta?: Record<string, unknown> | null
}

export interface AdjustInput {
  userId: number
  amount: number // 正数=加，负数=减；reset 时直接传目标值
  reason: CreditReason
  operatorId?: number | null
  operatorName?: string | null
  remark?: string | null
  meta?: Record<string, unknown> | null
}

export interface ListTransactionsFilters {
  userId?: number
  reason?: CreditReason
  startAt?: Date
  endAt?: Date
  limit?: number
  offset?: number
}

export const creditService = {
  /**
   * 前置校验扣费 · 事务内完成「积分校验 + 扣减 + 流水」，扣后余额恒 >= 0。
   * 余额不足抛 INSUFFICIENT_CREDITS。适用于「扣费前必须保证余额充足」的同步场景；
   * 后付费链路（调用已发生、必须记账）请改用 forceCharge。
   */
  async charge(input: ChargeInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
    if (amount === 0) return { charged: 0, balanceAfter: null }

    return db.transaction(async (tx: typeof db) => {
      // SELECT ... FOR UPDATE 等价 — drizzle 没有 forUpdate helper，用原子 UPDATE WHERE credits >= amount
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
  },

  /**
   * 后付费兜底扣费 · 用于「调用已发生、必须记账」的后置/重试扣费链路。
   *
   * 与 charge 的唯一区别：不做 credits >= amount 校验，余额不足时扣成负数。
   * 因为上游成本（如豆包/千问）此刻已真实产生，丢弃扣费等于平台白付；负余额会被
   * api-gate 的 balance < effectiveCost 校验挡住后续调用，直到用户充值回正。
   * 仅在用户不存在（极罕见，通常被 apiKey→users 外键挡住）时返回 0、不记流水，
   * 避免把不可重试的永久状态塞进重试队列空转。
   */
  async forceCharge(input: ChargeInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
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
  },

  /**
   * API 调用退款 · 用于扣款后判定失败的回滚。
   * 注意：当前流程 finish 后才扣款，正常不会触发；保留以防业务处理器内调用。
   */
  async refund(input: ChargeInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
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
  },

  /** 管理员加积分：amount > 0 */
  async adminGrant(input: AdjustInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
    if (amount === 0) throw new Error('amount must be > 0')

    return db.transaction(async (tx: typeof db) => {
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
        reason: 'admin_grant',
        operatorId: input.operatorId ?? null,
        operatorName: input.operatorName ?? null,
        remark: input.remark ?? null,
        meta: input.meta ?? null
      })
      return { userId: input.userId, balanceAfter }
    })
  },

  /** 管理员扣积分：amount > 0；不足时扣到 0（不抛错，记录实际扣除量） */
  async adminRevoke(input: AdjustInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
    if (amount === 0) throw new Error('amount must be > 0')

    return db.transaction(async (tx: typeof db) => {
      // 先查当前积分，决定实际扣除量
      const current = await tx.select({ credits: users.credits }).from(users).where(eq(users.id, input.userId)).limit(1)
      if (!current[0]) return null
      const actualDeduct = Math.min(Number(current[0].credits), amount)
      if (actualDeduct === 0) {
        await tx.insert(creditTransactions).values({
          userId: input.userId,
          amount: 0,
          balanceAfter: Number(current[0].credits),
          reason: 'admin_revoke',
          operatorId: input.operatorId ?? null,
          operatorName: input.operatorName ?? null,
          remark: input.remark ?? '积分不足，未实际扣减',
          meta: input.meta ?? null
        })
        return { userId: input.userId, balanceAfter: Number(current[0].credits) }
      }

      const updated = await tx.update(users)
        .set({
          credits: sql`${users.credits} - ${actualDeduct}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, input.userId))
        .returning({ credits: users.credits })

      const balanceAfter = Number(updated[0]?.credits || 0)
      await tx.insert(creditTransactions).values({
        userId: input.userId,
        amount: -actualDeduct,
        balanceAfter,
        reason: 'admin_revoke',
        operatorId: input.operatorId ?? null,
        operatorName: input.operatorName ?? null,
        remark: input.remark ?? null,
        meta: input.meta ?? null
      })
      return { userId: input.userId, balanceAfter }
    })
  },

  /** 管理员重置积分至指定值（默认 0） */
  async adminReset(input: AdjustInput & { targetValue?: number }) {
    const target = Math.max(Math.trunc(input.targetValue ?? 0), 0)
    return db.transaction(async (tx: typeof db) => {
      const current = await tx.select({ credits: users.credits }).from(users).where(eq(users.id, input.userId)).limit(1)
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
        reason: 'admin_reset',
        operatorId: input.operatorId ?? null,
        operatorName: input.operatorName ?? null,
        remark: input.remark ?? `重置为 ${target}`,
        meta: input.meta ?? null
      })
      return { userId: input.userId, balanceAfter }
    })
  },

  /**
   * 批量管理员调整 · 单一事务内对多个用户做同一操作。
   * userIds.length === 0 时视为「全部用户」，自动展开为所有未删除用户。
   */
  async adminBatchAdjust(input: {
    userIds: number[]
    operation: 'grant' | 'revoke' | 'reset'
    amount: number
    operatorId?: number | null
    operatorName?: string | null
    remark?: string | null
  }) {
    let targetIds = input.userIds
    if (!targetIds || targetIds.length === 0) {
      const allRows = await db.select({ id: users.id }).from(users)
      targetIds = allRows.map((r: { id: number }) => r.id)
    }

    const results: Array<{ userId: number, balanceAfter: number | null }> = []
    for (const userId of targetIds) {
      try {
        let r: { userId: number, balanceAfter: number } | null = null
        if (input.operation === 'grant') {
          r = await this.adminGrant({
            userId,
            amount: input.amount,
            reason: 'admin_grant',
            operatorId: input.operatorId,
            operatorName: input.operatorName,
            remark: input.remark
          })
        } else if (input.operation === 'revoke') {
          r = await this.adminRevoke({
            userId,
            amount: input.amount,
            reason: 'admin_revoke',
            operatorId: input.operatorId,
            operatorName: input.operatorName,
            remark: input.remark
          })
        } else if (input.operation === 'reset') {
          r = await this.adminReset({
            userId,
            amount: input.amount,
            targetValue: input.amount,
            reason: 'admin_reset',
            operatorId: input.operatorId,
            operatorName: input.operatorName,
            remark: input.remark
          })
        }
        if (r) results.push(r)
      } catch (err) {
        console.error('credit batch adjust failed', { userId, err })
      }
    }
    return { affected: results.length, results }
  },

  async getBalance(userId: number) {
    const rows = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId)).limit(1)
    return Number(rows[0]?.credits || 0)
  },

  async listBalances(userIds: number[]) {
    if (userIds.length === 0) return [] as Array<{ id: number, credits: number }>
    const rows = await db.select({ id: users.id, credits: users.credits })
      .from(users)
      .where(inArray(users.id, userIds))
    return rows.map((r: { id: number, credits: number }) => ({ id: r.id, credits: Number(r.credits) }))
  },

  async listTransactions(filters: ListTransactionsFilters = {}) {
    const conditions: SQL[] = []
    if (typeof filters.userId === 'number') conditions.push(eq(creditTransactions.userId, filters.userId))
    if (filters.reason) conditions.push(eq(creditTransactions.reason, filters.reason))
    if (filters.startAt) conditions.push(gte(creditTransactions.createdAt, filters.startAt))
    if (filters.endAt) conditions.push(lte(creditTransactions.createdAt, filters.endAt))

    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0)

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
  },

  /**
   * 用户积分流水（带 api 名称）·  按 userId 过滤 + 按 reason / 收支方向 筛选 + 分页。
   * direction: 'in' = amount > 0；'out' = amount < 0。
   */
  async listUserTransactions(userId: number, filters: {
    reason?: CreditReason
    direction?: 'in' | 'out'
    limit?: number
    offset?: number
  } = {}) {
    const conditions: SQL[] = [eq(creditTransactions.userId, userId)]
    if (filters.reason) conditions.push(eq(creditTransactions.reason, filters.reason))
    if (filters.direction === 'in') conditions.push(sql`${creditTransactions.amount} > 0`)
    else if (filters.direction === 'out') conditions.push(sql`${creditTransactions.amount} < 0`)

    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0)
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
        code: sql<string | null>`${creditTransactions.meta}->>'code'`, // 兑换码 chip：meta 快照
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
  },

  /**
   * 用户积分汇总：当前积分 + 累计收入/支出 + 按 reason 分桶。
   * 用于积分页顶部的统计卡片。
   */
  async getUserCreditsSummary(userId: number) {
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
    const byReason = reasonRows.map((r: { reason: string, count: number | string, sum: number | string }) => ({
      reason: r.reason,
      count: Number(r.count) || 0,
      sum: Number(r.sum) || 0
    }))

    return {
      balance,
      totalIn: Number(agg.totalIn) || 0,
      totalOut: Number(agg.totalOut) || 0,
      totalCount: Number(agg.totalCount) || 0,
      byReason
    }
  }
}
