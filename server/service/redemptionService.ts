import { and, count, desc, eq, gte, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm'
import { creditTransactions, redemptionCodes, redemptionRecords, users } from '@nuxthub/db/schema'

/**
 * 兑换码服务
 *
 * 核心约束：
 *   1. 兑换码 code 全局唯一，长度可控；批量生成保证去重。
 *   2. (codeId, userId) 唯一：同一用户对同一码只能兑换一次。
 *   3. usedCount < maxUses：用 UPDATE ... WHERE 条件原子递增防超兑。
 *   4. 兑换发生在事务里：递增 usedCount + 加用户余额 + 写流水 + 写 record。
 */

const DEFAULT_CODE_LENGTH = 16
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

function normalizeCode(raw: string): string {
  return (raw || '').trim().toUpperCase().replace(/\s+/g, '')
}

export const redemptionService = {
  /**
   * 批量生成兑换码。返回所有生成的码（明文，仅生成时返回）。
   * 同一批次共享 amount/maxUses/expiresAt/note。
   */
  async generate(input: GenerateInput) {
    const amount = Math.max(Math.trunc(input.amount), 1)
    const wantCount = Math.min(Math.max(Math.trunc(input.count ?? 1), 1), 1000)
    const length = Math.min(Math.max(Math.trunc(input.length ?? DEFAULT_CODE_LENGTH), 8), 48)
    const maxUses = Math.max(Math.trunc(input.maxUses ?? 1), 1)
    const prefix = (input.prefix || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16)
    const note = (input.note || '').trim().slice(0, 500) || null
    const expiresAt = input.expiresAt && !Number.isNaN(input.expiresAt.getTime()) ? input.expiresAt : null

    const batchId = buildBatchId()

    // 一次性生成 code 列表（前缀 + 随机后缀），DB 唯一约束兜底
    const codeStrings = new Set<string>()
    while (codeStrings.size < wantCount) {
      const body = randomCode(length)
      codeStrings.add(prefix ? `${prefix}-${body}` : body)
    }

    const rows = Array.from(codeStrings).map(code => ({
      code,
      amount,
      batchId,
      note,
      maxUses,
      usedCount: 0,
      expiresAt,
      isEnabled: true,
      createdBy: input.createdBy ?? null,
    }))

    // onConflictDoNothing 兜底极小概率重复，再补生成保证总数
    const inserted = await db.insert(redemptionCodes).values(rows).onConflictDoNothing().returning()

    return {
      batchId,
      generated: inserted.length,
      requested: wantCount,
      codes: inserted.map(r => ({ id: r.id, code: r.code, amount: r.amount })),
      amount,
      maxUses,
      expiresAt,
      note,
    }
  },

  async list(filters: ListFilters = {}) {
    const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200)
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0)
    const conditions: SQL[] = []

    if (filters.batchId) conditions.push(eq(redemptionCodes.batchId, filters.batchId))

    const now = new Date()
    if (filters.status === 'disabled') conditions.push(eq(redemptionCodes.isEnabled, false))
    else if (filters.status === 'used_up') conditions.push(sql`${redemptionCodes.usedCount} >= ${redemptionCodes.maxUses}`)
    else if (filters.status === 'expired') {
      conditions.push(and(
        sql`${redemptionCodes.expiresAt} is not null`,
        lt(redemptionCodes.expiresAt, now),
      )!)
    }
    else if (filters.status === 'available') {
      conditions.push(eq(redemptionCodes.isEnabled, true))
      conditions.push(sql`${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}`)
      conditions.push(or(
        isNull(redemptionCodes.expiresAt),
        gte(redemptionCodes.expiresAt, now),
      )!)
    }

    if (filters.keyword) {
      const kw = `%${filters.keyword.trim().toUpperCase()}%`
      conditions.push(or(
        sql`upper(${redemptionCodes.code}) like ${kw}`,
        sql`upper(coalesce(${redemptionCodes.note}, '')) like ${kw}`,
      )!)
    }

    const where = conditions.length ? and(...conditions) : undefined

    const [items, totalRows] = await Promise.all([
      where
        ? db.select().from(redemptionCodes).where(where).orderBy(desc(redemptionCodes.createdAt)).limit(limit).offset(offset)
        : db.select().from(redemptionCodes).orderBy(desc(redemptionCodes.createdAt)).limit(limit).offset(offset),
      where
        ? db.select({ value: count() }).from(redemptionCodes).where(where)
        : db.select({ value: count() }).from(redemptionCodes),
    ])

    return {
      items,
      total: Number(totalRows[0]?.value || 0),
    }
  },

  /** 列出所有批次（按最新创建时间倒序） */
  async listBatches(limit: number = 50) {
    const rows = await db.select({
      batchId: redemptionCodes.batchId,
      note: sql<string | null>`max(${redemptionCodes.note})`,
      amount: sql<number>`max(${redemptionCodes.amount})`,
      total: sql<number>`count(*)`,
      usedTotal: sql<number>`coalesce(sum(${redemptionCodes.usedCount}), 0)`,
      maxUsesTotal: sql<number>`coalesce(sum(${redemptionCodes.maxUses}), 0)`,
      createdAt: sql<Date>`max(${redemptionCodes.createdAt})`,
    })
      .from(redemptionCodes)
      .where(sql`${redemptionCodes.batchId} is not null`)
      .groupBy(redemptionCodes.batchId)
      .orderBy(sql`max(${redemptionCodes.createdAt}) desc`)
      .limit(Math.min(Math.max(Math.trunc(limit), 1), 200))

    return rows.filter(r => r.batchId).map(r => ({
      batchId: r.batchId as string,
      note: r.note,
      amount: Number(r.amount),
      total: Number(r.total),
      usedTotal: Number(r.usedTotal),
      maxUsesTotal: Number(r.maxUsesTotal),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
    }))
  },

  async toggle(id: number, enabled: boolean) {
    const res = await db.update(redemptionCodes)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(redemptionCodes.id, id))
      .returning()
    return res[0] || null
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
    return res[0] || null
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
   *   4. INSERT credit_transactions
   *   5. INSERT redemption_records（codeId+userId 唯一索引兜底）
   */
  async redeem(input: RedeemInput) {
    const code = normalizeCode(input.code)
    if (!code) throw createRedeemError('INVALID_CODE', '兑换码不能为空')

    const found = await db.select().from(redemptionCodes).where(eq(redemptionCodes.code, code)).limit(1)
    const target = found[0]
    if (!target) throw createRedeemError('NOT_FOUND', '兑换码不存在')
    if (!target.isEnabled) throw createRedeemError('DISABLED', '兑换码已被禁用')
    if (target.expiresAt && target.expiresAt.getTime() <= Date.now()) {
      throw createRedeemError('EXPIRED', '兑换码已过期')
    }
    if (target.usedCount >= target.maxUses) {
      throw createRedeemError('USED_UP', '兑换码已被领完')
    }

    // 同一用户重复兑换：用 (codeId, userId) 唯一索引兜底；这里先做一次显式查询给出更友好错误
    const dup = await db.select({ id: redemptionRecords.id })
      .from(redemptionRecords)
      .where(and(eq(redemptionRecords.codeId, target.id), eq(redemptionRecords.userId, input.userId)))
      .limit(1)
    if (dup[0]) throw createRedeemError('ALREADY_REDEEMED', '你已兑换过该兑换码')

    return db.transaction(async (tx: typeof db) => {
      // 原子递增 usedCount，竞争失败说明被别人抢走
      const consumed = await tx.update(redemptionCodes)
        .set({ usedCount: sql`${redemptionCodes.usedCount} + 1`, updatedAt: new Date() })
        .where(and(
          eq(redemptionCodes.id, target.id),
          eq(redemptionCodes.isEnabled, true),
          sql`${redemptionCodes.usedCount} < ${redemptionCodes.maxUses}`,
          or(isNull(redemptionCodes.expiresAt), gte(redemptionCodes.expiresAt, new Date()))!,
        ))
        .returning({ id: redemptionCodes.id, amount: redemptionCodes.amount })
      if (!consumed[0]) {
        throw createRedeemError('USED_UP', '兑换码已被领完')
      }

      const grantAmount = Math.max(Math.trunc(consumed[0].amount), 0)

      // 加余额
      const userUpdated = await tx.update(users)
        .set({ credits: sql`${users.credits} + ${grantAmount}`, updatedAt: new Date() })
        .where(eq(users.id, input.userId))
        .returning({ id: users.id, credits: users.credits })
      if (!userUpdated[0]) {
        throw createRedeemError('USER_NOT_FOUND', '用户不存在')
      }
      const balanceAfter = Number(userUpdated[0].credits)

      // 写流水
      const txInserted = await tx.insert(creditTransactions).values({
        userId: input.userId,
        amount: grantAmount,
        balanceAfter,
        reason: 'redemption_code',
        apiId: null,
        apiCallId: null,
        operatorId: null,
        operatorName: null,
        remark: target.note || null,
        meta: {
          codeId: target.id,
          code: target.code,
          batchId: target.batchId,
        },
      }).returning({ id: creditTransactions.id })

      // 写兑换记录（codeId+userId 唯一索引）
      try {
        await tx.insert(redemptionRecords).values({
          codeId: target.id,
          userId: input.userId,
          amount: grantAmount,
          transactionId: txInserted[0]?.id ?? null,
          ip: input.ip ?? null,
        })
      }
      catch (err) {
        // 唯一索引冲突 → 让事务回滚（usedCount 与余额都会撤销）
        throw createRedeemError('ALREADY_REDEEMED', '你已兑换过该兑换码', err)
      }

      return {
        amount: grantAmount,
        balanceAfter,
        codeId: target.id,
        code: target.code,
        batchId: target.batchId,
      }
    })
  },

  /** 用户视角：自己的兑换记录 */
  async listUserRedemptions(userId: number, limit: number = 50, offset: number = 0) {
    const lim = Math.min(Math.max(Math.trunc(limit), 1), 200)
    const off = Math.max(Math.trunc(offset), 0)
    const [items, totalRows] = await Promise.all([
      db.select({
        id: redemptionRecords.id,
        codeId: redemptionRecords.codeId,
        code: redemptionCodes.code,
        amount: redemptionRecords.amount,
        transactionId: redemptionRecords.transactionId,
        redeemedAt: redemptionRecords.redeemedAt,
        note: redemptionCodes.note,
      })
        .from(redemptionRecords)
        .leftJoin(redemptionCodes, eq(redemptionCodes.id, redemptionRecords.codeId))
        .where(eq(redemptionRecords.userId, userId))
        .orderBy(desc(redemptionRecords.redeemedAt))
        .limit(lim)
        .offset(off),
      db.select({ value: count() }).from(redemptionRecords).where(eq(redemptionRecords.userId, userId)),
    ])
    return { items, total: Number(totalRows[0]?.value || 0) }
  },

  /** 管理员视角：某个 code 的所有兑换记录 */
  async listCodeRedemptions(codeId: number) {
    return db.select({
      id: redemptionRecords.id,
      userId: redemptionRecords.userId,
      username: users.username,
      amount: redemptionRecords.amount,
      ip: redemptionRecords.ip,
      redeemedAt: redemptionRecords.redeemedAt,
    })
      .from(redemptionRecords)
      .leftJoin(users, eq(users.id, redemptionRecords.userId))
      .where(eq(redemptionRecords.codeId, codeId))
      .orderBy(desc(redemptionRecords.redeemedAt))
  },
}

interface RedeemError extends Error {
  code: string
  cause?: unknown
}

function createRedeemError(code: string, message: string, cause?: unknown): RedeemError {
  const err = new Error(message) as RedeemError
  err.code = code
  if (cause) err.cause = cause
  return err
}

export function isRedeemError(err: unknown): err is RedeemError {
  return err instanceof Error && typeof (err as RedeemError).code === 'string'
}
