import { and, count, desc, eq, gte, isNull, lt, or, sql, type SQL } from 'drizzle-orm'
import { creditTransactions, redemptionCodes, users } from '@nuxthub/db/schema'
import {
  buildRedemptionCodeRows,
  insertRedemptionCodesUntilComplete,
  normalizeRedemptionGeneration
} from '~~/server/services/redemption-code-generation'
import { toIsoString } from '~~/server/utils/date'
import { toNumber } from '~~/server/utils/number'
import { normalizePagination } from '~~/server/utils/pagination'
import { firstRow } from '~~/server/utils/row'

/**
 * 兑换码服务
 *
 * 核心约束：
 *   1. 兑换码 code 全局唯一，长度可控；批量生成保证去重。
 *   2. (codeId, userId) 唯一：同一用户对同一码只能兑换一次。
 *   3. usedCount < maxUses：用 UPDATE ... WHERE 条件原子递增防超兑。
 *   4. 兑换发生在事务里：递增 usedCount + 加用户积分 + 写流水 + 写 record。
 */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆 0/O/I/1

export type RedemptionStatus = 'enabled' | 'disabled' | 'used_up' | 'expired' | 'available'

export interface GenerateInput {
  amount: number
  count?: number // 一次生成多少张，默认 1，最多 1000
  prefix?: string | null
  length?: number // 不含 prefix 的随机部分长度，默认 16
  maxUses?: number // 单张最大被使用次数，默认 1
  expiresAt?: Date | null
  note?: string | null
  createdBy?: number | null
}

export interface ListFilters {
  batchId?: string
  status?: RedemptionStatus | 'all'
  keyword?: string // 模糊匹配 code / note
  limit?: number
  offset?: number
}

export interface RedeemInput {
  userId: number
  code: string
  ip?: string | null
}

function randomCode(length: number): string {
  let out = ''
  // 用 Math.random 简单生成；批量生成时通过 DB unique 兜底冲突
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return out
}

function buildBatchId(): string {
  // 形如 B-2026-05-01-XXXX
  const d = new Date()
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const tail = randomCode(4)
  return `B-${yyyy}-${mm}-${dd}-${tail}`
}

function createCodeStrings(count: number, length: number, prefix: string): string[] {
  const codeStrings = new Set<string>()
  while (codeStrings.size < count) {
    const body = randomCode(length)
    codeStrings.add(prefix ? `${prefix}-${body}` : body)
  }
  return Array.from(codeStrings)
}

function normalizeCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '')
}

export const redemptionService = {
  /**
   * 批量生成兑换码。返回所有生成的码（明文，仅生成时返回）。
   * 同一批次共享 amount/maxUses/expiresAt/note。
   */
  async generate(input: GenerateInput) {
    const normalized = normalizeRedemptionGeneration(input)
    const batchId = buildBatchId()

    const inserted = await insertRedemptionCodesUntilComplete<
      typeof redemptionCodes.$inferInsert,
      typeof redemptionCodes.$inferSelect
    >({
      requestedCount: normalized.count,
      createRows: count => buildRedemptionCodeRows({
        codes: createCodeStrings(count, normalized.length, normalized.prefix),
        amount: normalized.amount,
        batchId,
        note: normalized.note,
        maxUses: normalized.maxUses,
        expiresAt: normalized.expiresAt,
        createdBy: normalized.createdBy
      }),
      insertRows: rows => db.insert(redemptionCodes).values(rows).onConflictDoNothing().returning()
    })

    return {
      batchId,
      generated: inserted.length,
      requested: normalized.count,
      codes: inserted.map((r: typeof redemptionCodes.$inferSelect) => ({ id: r.id, code: r.code, amount: r.amount })),
      amount: normalized.amount,
      maxUses: normalized.maxUses,
      expiresAt: normalized.expiresAt,
      note: normalized.note
    }
  },

  async list(filters: ListFilters = {}) {
    const { limit, offset } = normalizePagination(filters)
    const conditions: SQL[] = []

    if (filters.batchId) conditions.push(eq(redemptionCodes.batchId, filters.batchId))

    const now = new Date()
    if (filters.status === 'disabled') conditions.push(eq(redemptionCodes.isEnabled, false))
    else if (filters.status === 'used_up') conditions.push(sql`${redemptionCodes.usedCount} >= ${redemptionCodes.maxUses}`)
    else if (filters.status === 'expired') {
      conditions.push(and(
        sql`${redemptionCodes.expiresAt} is not null`,
        lt(redemptionCodes.expiresAt, now)
      )!)
    } else if (filters.status === 'available') {
      conditions.push(eq(redemptionCodes.isEnabled, true))
      conditions.push(sql`${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}`)
      conditions.push(or(
        isNull(redemptionCodes.expiresAt),
        gte(redemptionCodes.expiresAt, now)
      )!)
    }

    if (filters.keyword) {
      const kw = `%${filters.keyword.trim().toUpperCase()}%`
      conditions.push(or(
        sql`upper(${redemptionCodes.code}) like ${kw}`,
        sql`upper(coalesce(${redemptionCodes.note}, '')) like ${kw}`
      )!)
    }

    const where = conditions.length ? and(...conditions) : undefined

    const [items, totalRows] = await Promise.all([
      where
        ? db.select().from(redemptionCodes).where(where).orderBy(desc(redemptionCodes.createdAt)).limit(limit).offset(offset)
        : db.select().from(redemptionCodes).orderBy(desc(redemptionCodes.createdAt)).limit(limit).offset(offset),
      where
        ? db.select({ value: count() }).from(redemptionCodes).where(where)
        : db.select({ value: count() }).from(redemptionCodes)
    ])

    return {
      items,
      total: toNumber(totalRows[0]?.value)
    }
  },

  /** 列出所有批次（按最新创建时间倒序） */
  async listBatches(limit: number = 50) {
    const { limit: normalizedLimit } = normalizePagination({ limit })
    const rows = await db.select({
      batchId: redemptionCodes.batchId,
      note: sql<string | null>`max(${redemptionCodes.note})`,
      amount: sql<number>`max(${redemptionCodes.amount})`,
      total: sql<number>`count(*)`,
      usedTotal: sql<number>`coalesce(sum(${redemptionCodes.usedCount}), 0)`,
      maxUsesTotal: sql<number>`coalesce(sum(${redemptionCodes.maxUses}), 0)`,
      createdAt: sql<Date>`max(${redemptionCodes.createdAt})`
    })
      .from(redemptionCodes)
      .where(sql`${redemptionCodes.batchId} is not null`)
      .groupBy(redemptionCodes.batchId)
      .orderBy(sql`max(${redemptionCodes.createdAt}) desc`)
      .limit(normalizedLimit)

    type BatchRow = {
      batchId: string | null
      note: string | null
      amount: number
      total: number
      usedTotal: number
      maxUsesTotal: number
      createdAt: Date
    }
    return rows.filter((r: BatchRow) => r.batchId).map((r: BatchRow) => ({
      batchId: r.batchId as string,
      note: r.note,
      amount: toNumber(r.amount),
      total: toNumber(r.total),
      usedTotal: toNumber(r.usedTotal),
      maxUsesTotal: toNumber(r.maxUsesTotal),
      createdAt: toIsoString(r.createdAt)
    }))
  },

  async toggle(id: number, enabled: boolean) {
    const res = await db.update(redemptionCodes)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(redemptionCodes.id, id))
      .returning()
    return firstRow(res)
  },

  /** 批量启用/禁用整个批次 */
  async toggleBatch(batchId: string, enabled: boolean) {
    const res = await db.update(redemptionCodes)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(redemptionCodes.batchId, batchId))
      .returning({ id: redemptionCodes.id })
    return { affected: res.length }
  },

  async remove(id: number) {
    const res = await db.delete(redemptionCodes).where(eq(redemptionCodes.id, id)).returning()
    return firstRow(res)
  },

  /** 删除整个批次（仅未被使用过的码会被删除，已被使用的保留以保证审计） */
  async removeBatch(batchId: string, includeUsed: boolean) {
    if (includeUsed) {
      const res = await db.delete(redemptionCodes).where(eq(redemptionCodes.batchId, batchId)).returning({ id: redemptionCodes.id })
      return { affected: res.length }
    }
    const res = await db.delete(redemptionCodes)
      .where(and(eq(redemptionCodes.batchId, batchId), eq(redemptionCodes.usedCount, 0)))
      .returning({ id: redemptionCodes.id })
    return { affected: res.length }
  },

  /**
   * 用户兑换：在事务里完成
   *   1. 校验 code 存在 + isEnabled + 未过期 + usedCount < maxUses + (codeId,userId) 不存在
   *   2. UPDATE redemption_codes SET used_count = used_count + 1 WHERE used_count < max_uses AND ...
   *      → 失败说明并发竞争已抢光，抛 USED_UP
   *   3. UPDATE users SET credits = credits + amount RETURNING new credits
   *   4. INSERT credit_transactions（含 codeId/ip 快照；(codeId,userId) 部分唯一索引兜底重复兑换）
   */
  async redeem(input: RedeemInput) {
    const code = normalizeCode(input.code)
    if (!code) throw createRedemptionError('INVALID_CODE', '兑换码不能为空')

    const found = await db.select().from(redemptionCodes).where(eq(redemptionCodes.code, code)).limit(1)
    const target = found[0]
    if (!target) throw createRedemptionError('NOT_FOUND', '兑换码不存在')
    if (!target.isEnabled) throw createRedemptionError('DISABLED', '兑换码已被禁用')
    if (target.expiresAt && target.expiresAt.getTime() <= Date.now()) {
      throw createRedemptionError('EXPIRED', '兑换码已过期')
    }
    if (target.usedCount >= target.maxUses) {
      throw createRedemptionError('USED_UP', '兑换码已被领完')
    }

    // 同一用户重复兑换：用 creditTransactions (codeId, userId) 部分唯一索引兜底；
    // 这里先做一次显式查询给出更友好错误。
    const dup = await db.select({ id: creditTransactions.id })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.codeId, target.id),
        eq(creditTransactions.userId, input.userId),
        eq(creditTransactions.reason, 'redemption_code')
      ))
      .limit(1)
    if (dup[0]) throw createRedemptionError('ALREADY_REDEEMED', '你已兑换过该兑换码')

    return db.transaction(async (tx: typeof db) => {
      // 原子递增 usedCount，竞争失败说明被别人抢走
      const consumed = await tx.update(redemptionCodes)
        .set({ usedCount: sql`${redemptionCodes.usedCount} + 1`, updatedAt: new Date() })
        .where(and(
          eq(redemptionCodes.id, target.id),
          eq(redemptionCodes.isEnabled, true),
          sql`${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}`,
          or(isNull(redemptionCodes.expiresAt), gte(redemptionCodes.expiresAt, new Date()))!
        ))
        .returning({ id: redemptionCodes.id, amount: redemptionCodes.amount })
      if (!consumed[0]) {
        throw createRedemptionError('USED_UP', '兑换码已被领完')
      }

      const grantAmount = Math.max(Math.trunc(consumed[0].amount), 0)

      // 加积分
      const userUpdated = await tx.update(users)
        .set({ credits: sql`${users.credits} + ${grantAmount}`, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, credits: users.credits })
      if (!userUpdated[0]) {
        throw createRedemptionError('USER_NOT_FOUND', '用户不存在')
      }
      const balanceAfter = toNumber(userUpdated[0].credits)

      // 写流水（兑换记录已并入 credit_transactions）：codeId 关联兑换码、ip 记录来源，
      // meta 保留 code/batchId 快照以便删码后仍可显示。
      // (codeId, userId) 部分唯一索引兜底重复兑换 —— 冲突即事务回滚，usedCount 与积分一并撤销。
      try {
        await tx.insert(creditTransactions).values({
          userId: input.userId,
          amount: grantAmount,
          balanceAfter,
          reason: 'redemption_code',
          apiId: null,
          apiCallId: null,
          codeId: target.id,
          operatorId: null,
          operatorName: null,
          ip: input.ip ?? null,
          remark: target.note || null,
          meta: {
            code: target.code,
            batchId: target.batchId
          }
        })
      } catch (err) {
        throw createRedemptionError('ALREADY_REDEEMED', '你已兑换过该兑换码', err)
      }

      return {
        amount: grantAmount,
        balanceAfter,
        codeId: target.id,
        code: target.code,
        batchId: target.batchId
      }
    })
  },

  /** 用户视角：自己的兑换记录（即 reason='redemption_code' 的积分流水） */
  async listUserRedemptions(userId: number, limit: number = 50, offset: number = 0) {
    const pagination = normalizePagination({ limit, offset })
    const where = and(
      eq(creditTransactions.userId, userId),
      eq(creditTransactions.reason, 'redemption_code')
    )
    const [items, totalRows] = await Promise.all([
      db.select({
        id: creditTransactions.id,
        codeId: creditTransactions.codeId,
        code: sql<string | null>`${creditTransactions.meta}->>'code'`, // meta 快照，删码后仍可显示
        amount: creditTransactions.amount,
        redeemedAt: creditTransactions.createdAt,
        note: creditTransactions.remark // redeem 时 remark = 兑换码 note 快照
      })
        .from(creditTransactions)
        .where(where)
        .orderBy(desc(creditTransactions.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset),
      db.select({ value: count() }).from(creditTransactions).where(where)
    ])
    return { items, total: toNumber(totalRows[0]?.value) }
  }
}

export interface RedemptionError extends Error {
  readonly code: string
  readonly cause?: unknown
}

export function createRedemptionError(code: string, message: string, cause?: unknown): RedemptionError {
  return Object.assign(new Error(message), {
    name: 'RedemptionError',
    code,
    ...(cause === undefined ? {} : { cause })
  })
}

export function isRedemptionError(error: unknown): error is RedemptionError {
  return error instanceof Error
    && error.name === 'RedemptionError'
    && typeof (error as { code?: unknown }).code === 'string'
}
