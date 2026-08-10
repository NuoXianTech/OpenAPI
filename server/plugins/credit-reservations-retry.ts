/**
 * Recovers durable paid-call settlement intents. Redis coordinates scans
 * across Node instances; single-process deployments use the lease fallback.
 */

import { creditService } from '~~/server/services/credit-service'
import { withDistributedLease } from '~~/server/utils/distributed-lease'

const SCAN_INTERVAL_MS = 30_000
const BATCH_SIZE = 20
const WORKER_LEASE_TTL_MS = 300_000
const STALE_ACTIVE_RESERVATION_MS = 10 * 60_000
const TIMER_KEY = Symbol.for('creditReservationsRetry.timer')

type GlobalWithTimer = typeof globalThis & {
  [TIMER_KEY]?: NodeJS.Timeout
}

async function processReservations(): Promise<void> {
  try {
    await creditService.releaseExpiredReservations(
      new Date(Date.now() - STALE_ACTIVE_RESERVATION_MS)
    )
  } catch (error) {
    console.error('[credit-reservations] failed to release stale active reservations', {
      error: (error as Error).message
    })
  }

  let dueRows: Awaited<ReturnType<typeof creditService.claimDueReservations>>
  try {
    dueRows = await creditService.claimDueReservations(BATCH_SIZE)
  } catch (error) {
    console.error('[credit-reservations] failed to load pending reservations', {
      error: (error as Error).message
    })
    return
  }

  for (const row of dueRows) {
    try {
      await creditService.finalizeReservation({ reservationId: row.id })
    } catch (error) {
      const message = (error as Error).message || 'settlement retry failed'
      console.warn('[credit-reservations] settlement retry failed', {
        reservationId: row.id,
        attempts: row.attempts + 1,
        error: message
      })
      await creditService.markReservationAttempt(row.id, message).catch((markError) => {
        console.error('[credit-reservations] failed to record retry attempt', {
          reservationId: row.id,
          error: (markError as Error).message
        })
      })
    }
  }
}

async function runOnce(): Promise<void> {
  try {
    await withDistributedLease({
      key: 'credit-reservations-retry',
      ttlMs: WORKER_LEASE_TTL_MS
    }, processReservations)
  } catch (error) {
    console.error('[credit-reservations] worker coordination unavailable; scan skipped', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

export default defineNitroPlugin((nitroApp) => {
  const globalWithTimer = globalThis as GlobalWithTimer
  if (globalWithTimer[TIMER_KEY]) clearInterval(globalWithTimer[TIMER_KEY])

  const timer = setInterval(() => void runOnce(), SCAN_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
  globalWithTimer[TIMER_KEY] = timer

  nitroApp.hooks.hook('close', () => {
    if (!globalWithTimer[TIMER_KEY]) return
    clearInterval(globalWithTimer[TIMER_KEY])
    globalWithTimer[TIMER_KEY] = undefined
  })
})
