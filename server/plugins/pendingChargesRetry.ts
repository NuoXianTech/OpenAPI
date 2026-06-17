/**
 * Pending charge retry worker for the single production Node process.
 */

import { apiCallService } from '~~/server/service/apiCallService'
import { apiKeyService } from '~~/server/service/apiKeyService'
import { creditService } from '~~/server/service/creditService'
import { pendingChargeService } from '~~/server/service/pendingChargeService'

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
      // 历史遗留的余额不足行（旧 charge 入队的）也会在此自愈——扣成负数后 complete。
      const r = await creditService.forceCharge({
        userId: row.userId,
        amount: row.amount,
        apiId: row.apiId,
        apiCallId: row.apiCallId,
        remark: row.remark
      })
      if (r.charged > 0) {
        await apiCallService.patchCreditsCost(row.apiCallId, r.charged)
        const apiKeyId = await apiCallService.getApiKeyIdForCall(row.apiCallId).catch(() => null)
        if (apiKeyId) {
          apiKeyService.addUsedCredits(apiKeyId, r.charged).catch((err) => {
            console.error('[pending-charges] failed to accumulate apiKey usedCredits', {
              apiKeyId,
              amount: r.charged,
              error: (err as Error).message
            })
          })
        }
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
  if (typeof timer.unref === 'function') timer.unref()
  g[TIMER_KEY] = timer
})
