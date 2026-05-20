import { and, asc, eq, lte } from 'drizzle-orm'
import { pendingCharges } from '@nuxthub/db/schema'

/**
 * 待扣费补偿队列服务。
 *
 * 设计要点：
 *   - 唯一索引 (apiCallId) 防止同一次调用重复入队
 *   - status 仅 'pending' / 'dead_letter'；成功扣费后直接删除（不留 succeeded 行，避免无限增长）
 *   - 指数退避：每次失败 nextAttemptAt += BACKOFF_SCHEDULE[attempts]
 *   - 重试上限：达到 MAX_ATTEMPTS 后转 dead_letter，需要 admin 手动介入
 */

export const PENDING_CHARGE_MAX_ATTEMPTS = 5

// 退避秒数：30s → 1min → 2min → 5min → 10min；第 5 次失败转 dead_letter
const BACKOFF_SECONDS_SCHEDULE = [30, 60, 120, 300, 600]

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

  /** 取一批到期的 pending 任务，按 nextAttemptAt 升序 */
  async listDue(limit: number): Promise<DueRow[]> {
    const rows = await db.select({
      id: pendingCharges.id,
      apiCallId: pendingCharges.apiCallId,
      userId: pendingCharges.userId,
      apiId: pendingCharges.apiId,
      amount: pendingCharges.amount,
      remark: pendingCharges.remark,
      attempts: pendingCharges.attempts
    })
      .from(pendingCharges)
      .where(and(
        eq(pendingCharges.status, 'pending'),
        lte(pendingCharges.nextAttemptAt, new Date())
      ))
      .orderBy(asc(pendingCharges.nextAttemptAt))
      .limit(Math.max(Math.trunc(limit), 1))

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

  /** 重试失败 · 累加 attempts 并按退避表延后；达到上限转 dead_letter */
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
      status: isDead ? 'dead_letter' : 'pending'
    }).where(eq(pendingCharges.id, id))
  },

  /** 重试成功 · 删除队列行 */
  async complete(id: number) {
    await db.delete(pendingCharges).where(eq(pendingCharges.id, id))
  }
}
