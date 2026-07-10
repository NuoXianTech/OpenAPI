/**
 * Pending charge retry worker for the single production Node process.
 */

import { apiCallService } from '~~/server/services/api-call-service'
import { creditService } from '~~/server/services/credit-service'
import { pendingChargeService } from '~~/server/services/pending-charge-service'

const SCAN_INTERVAL_MS = 30_000
const BATCH_SIZE = 20
const TIMER_KEY = Symbol.for('pendingChargesRetry.timer')

type GlobalWithTimer = typeof globalThis & {
  [TIMER_KEY]?: NodeJS.Timeout
}

async function runOnce() {
  let dueRows: Awaited<ReturnType<typeof pendingChargeService.claimDue>>
  try {
    dueRows = await pendingChargeService.claimDue(BATCH_SIZE)
  } catch (err) {
    console.error('[pending-charges] failed to load due rows', { error: (err as Error).message })
    return
  }
  if (dueRows.length === 0) return

  for (const row of dueRows) {
    try {
      // forceCharge 允许扣成负数：队列只承载瞬时故障，重试到 DB 恢复即成功。
      const r = await creditService.forceCharge({
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

export default defineNitroPlugin((nitroApp) => {
  const g = globalThis as GlobalWithTimer
  if (g[TIMER_KEY]) {
    clearInterval(g[TIMER_KEY])
  }

  const timer = setInterval(() => {
    void runOnce()
  }, SCAN_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
  g[TIMER_KEY] = timer

  nitroApp.hooks.hook('close', () => {
    if (!g[TIMER_KEY]) return
    clearInterval(g[TIMER_KEY])
    g[TIMER_KEY] = undefined
  })
})
