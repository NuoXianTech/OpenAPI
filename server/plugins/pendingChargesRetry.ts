/**
 * 待扣费补偿重试 · Nitro plugin
 *
 * 启动后挂一个 setInterval，每 30s 扫描一次 pending_charges，
 * 用 pendingChargeService.claimDue 抢占式认领一批到期任务（原子转 processing
 * 并写 lease），串行重试 charge：
 *   - 成功 → patchCreditsCost + 删除队列行
 *   - 失败 → markAttempt（attempts +1，nextAttemptAt += 退避，释放 lease；达到上限转 dead_letter）
 *
 * 多实例安全：claimDue 用 UPDATE...IN (SELECT FOR UPDATE SKIP LOCKED) 保证
 * 同一行只会被一个实例认领；worker 崩溃后 lease 到期，行被重新认领，不会卡死。
 * 兜底：credit_transactions (apiCallId, reason) 部分唯一索引让任何漏过认领的
 * 重复 charge 在 INSERT 时被 DB 拒绝，整个事务回滚，余额不会双扣。
 *
 * dev HMR 友好：使用全局符号注册 timer 句柄，热更新前清除上一轮 setInterval，
 * 避免多个 plugin 实例叠加触发重复扣费。
 */

import { apiCallService } from '~~/server/service/apiCallService'
import { creditService } from '~~/server/service/creditService'
import { pendingChargeService } from '~~/server/service/pendingChargeService'

const SCAN_INTERVAL_MS = 30_000
const BATCH_SIZE = 20
const TIMER_KEY = Symbol.for('pendingChargesRetry.timer')

type GlobalWithTimer = typeof globalThis & {
  [TIMER_KEY]?: NodeJS.Timeout
}

async function runOnce() {
  let claimed: Awaited<ReturnType<typeof pendingChargeService.claimDue>>
  try {
    claimed = await pendingChargeService.claimDue(BATCH_SIZE)
  } catch (err) {
    console.error('[pending-charges] failed to claim due rows', { error: (err as Error).message })
    return
  }
  if (claimed.length === 0) return

  for (const row of claimed) {
    try {
      const r = await creditService.charge({
        userId: row.userId,
        amount: row.amount,
        apiId: row.apiId,
        apiCallId: row.apiCallId,
        remark: row.remark
      })
      if (r.charged > 0) {
        await apiCallService.patchCreditsCost(row.apiCallId, r.charged)
      }
      await pendingChargeService.complete(row.id)
    } catch (err) {
      const error = (err as Error).message || 'retry failed'
      console.warn('[pending-charges] retry failed, will backoff', {
        id: row.id,
        apiCallId: row.apiCallId,
        attempts: row.attempts + 1,
        error
      })
      await pendingChargeService.markAttempt(row.id, error).catch((e) => {
        console.error('[pending-charges] failed to record attempt', {
          id: row.id,
          error: (e as Error).message
        })
      })
    }
  }
}

export default defineNitroPlugin(() => {
  const g = globalThis as GlobalWithTimer
  if (g[TIMER_KEY]) {
    clearInterval(g[TIMER_KEY])
  }

  const timer = setInterval(() => {
    void runOnce()
  }, SCAN_INTERVAL_MS)
  // Node 下不阻塞退出
  if (typeof timer.unref === 'function') timer.unref()
  g[TIMER_KEY] = timer
})
