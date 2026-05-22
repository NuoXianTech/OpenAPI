import { and, asc, eq, inArray, lte, or } from 'drizzle-orm'
import { pendingCharges } from '@nuxthub/db/schema'

/**
 * 待扣费补偿队列服务。
 *
 * 设计要点：
 *   - 唯一索引 (apiCallId) 防止同一次调用重复入队
 *   - status: 'pending' / 'processing' / 'dead_letter'；成功扣费后直接删除
 *     （不留 succeeded 行，避免无限增长）
 *   - 多实例抢占式认领：claimDue 用 UPDATE...IN (SELECT ... FOR UPDATE SKIP LOCKED)
 *     原子把一批 pending 转成 processing 并写入 lease；其他实例同一窗口跳过这些行
 *   - worker 崩溃恢复：lease 到期的 processing 行被下一轮认领；attempts 不会被丢
 *   - 指数退避：每次失败 nextAttemptAt += BACKOFF_SECONDS_SCHEDULE[attempts]
 *   - 重试上限：达到 MAX_ATTEMPTS 后转 dead_letter，需要 admin 手动介入
 *   - 兜底防双扣：credit_transactions 上有 (apiCallId, reason) 部分唯一索引；
 *     即使本服务的认领逻辑有 bug，重复 charge 会在 INSERT 阶段被 DB 拒绝
 */

export const PENDING_CHARGE_MAX_ATTEMPTS = 5

// 退避秒数：30s → 1min → 2min → 5min → 10min；第 5 次失败转 dead_letter
const BACKOFF_SECONDS_SCHEDULE = [30, 60, 120, 300, 600]

// 认领后的 lease 时长（秒）。需大于单行 charge 的最坏耗时；worker 崩溃后这段时间内
// 该行无法被重新认领，所以也不能太大，否则补偿延迟拉长。
const DEFAULT_LEASE_SECONDS = 60

function nextAttemptAt(attempts: number): Date {
  const index = Math.min(Math.max(attempts, 0), BACKOFF_SECONDS_SCHEDULE.length - 1)
  const seconds = BACKOFF_SECONDS_SCHEDULE[index]!
  return new Date(Date.now() + seconds * 1000)
}

export interface EnqueueInput {
  apiCallId: number
  userId: number
  apiId: number
  amount: number
  remark?: string | null
  error: string
}

export interface DueRow {
  id: number
  apiCallId: number
  userId: number
  apiId: number
  amount: number
  remark: string | null
  attempts: number
}

export const pendingChargeService = {
  /**
   * 入队 · 同一 apiCallId 已存在时静默忽略（避免补偿队列自己重试时再次入队）。
   * 立即可被首次拾取（nextAttemptAt = now），调度器扫描时即可重试。
   */
  async enqueue(input: EnqueueInput) {
    const amount = Math.max(Math.trunc(input.amount), 0)
    if (amount === 0) return

    await db.insert(pendingCharges).values({
      apiCallId: input.apiCallId,
      userId: input.userId,
      apiId: input.apiId,
      amount,
      remark: input.remark ?? null,
      attempts: 0,
      lastError: input.error.slice(0, 500),
      lastAttemptAt: new Date(),
      nextAttemptAt: new Date(),
      status: 'pending'
    }).onConflictDoNothing({ target: pendingCharges.apiCallId })
  },

  /**
   * 抢占式认领一批到期任务：把 status 转 processing 并写 lease，原子返回认领到的行。
   *
   * 涵盖两种来源：
   *   1. pending 且 nextAttemptAt <= now —— 正常到期重试
   *   2. processing 且 leaseExpiresAt <= now —— 上一次持有者崩溃 / 卡死，重新认领
   *
   * SELECT FOR UPDATE SKIP LOCKED 让并发实例彼此跳过对方持有的行；外层 UPDATE
   * 的写锁确保即使没有 SKIP LOCKED 支持的驱动也至少有"先到先得"语义。
   */
  async claimDue(limit: number, leaseSeconds: number = DEFAULT_LEASE_SECONDS): Promise<DueRow[]> {
    const max = Math.max(Math.trunc(limit), 1)
    const lease = Math.max(Math.trunc(leaseSeconds), 30)
    const now = new Date()
    const newLeaseExpiresAt = new Date(now.getTime() + lease * 1000)

    const candidates = db.select({ id: pendingCharges.id })
      .from(pendingCharges)
      .where(or(
        and(eq(pendingCharges.status, 'pending'), lte(pendingCharges.nextAttemptAt, now)),
        and(eq(pendingCharges.status, 'processing'), lte(pendingCharges.leaseExpiresAt, now))
      ))
      .orderBy(asc(pendingCharges.nextAttemptAt))
      .limit(max)
      .for('update', { skipLocked: true })

    const rows = await db.update(pendingCharges)
      .set({
        status: 'processing',
        leaseExpiresAt: newLeaseExpiresAt,
        lastAttemptAt: now
      })
      .where(inArray(pendingCharges.id, candidates))
      .returning({
        id: pendingCharges.id,
        apiCallId: pendingCharges.apiCallId,
        userId: pendingCharges.userId,
        apiId: pendingCharges.apiId,
        amount: pendingCharges.amount,
        remark: pendingCharges.remark,
        attempts: pendingCharges.attempts
      })

    return rows.map((row: typeof rows[number]) => ({
      id: row.id,
      apiCallId: row.apiCallId,
      userId: row.userId,
      apiId: row.apiId,
      amount: row.amount,
      remark: row.remark,
      attempts: row.attempts
    }))
  },

  /** 重试失败 · 累加 attempts 并按退避表延后；达到上限转 dead_letter；释放 lease 让下一轮重新认领 */
  async markAttempt(id: number, error: string) {
    const rows = await db.select({ attempts: pendingCharges.attempts })
      .from(pendingCharges)
      .where(eq(pendingCharges.id, id))
      .limit(1)
    const current = rows[0]
    if (!current) return

    const nextAttempts = current.attempts + 1
    const truncatedError = error.slice(0, 500)
    const isDead = nextAttempts >= PENDING_CHARGE_MAX_ATTEMPTS

    await db.update(pendingCharges).set({
      attempts: nextAttempts,
      lastAttemptAt: new Date(),
      nextAttemptAt: nextAttemptAt(nextAttempts),
      lastError: truncatedError,
      status: isDead ? 'dead_letter' : 'pending',
      leaseExpiresAt: null
    }).where(eq(pendingCharges.id, id))
  },

  /** 重试成功 · 删除队列行 */
  async complete(id: number) {
    await db.delete(pendingCharges).where(eq(pendingCharges.id, id))
  }
}
