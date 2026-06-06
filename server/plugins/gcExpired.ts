/**
 * Expired-record GC for the single production Node process.
 */

import { verificationTokenService } from '~~/server/service/verificationTokenService'

const SCAN_INTERVAL_MS = 60 * 60 * 1_000
const TIMER_KEY = Symbol.for('gcExpired.timer')

type GlobalWithTimer = typeof globalThis & {
  [TIMER_KEY]?: NodeJS.Timeout
}

async function runOnce() {
  const jobs: Array<[string, () => Promise<void>]> = [
    ['verification_tokens', () => verificationTokenService.deleteExpired()]
  ]
  for (const [name, job] of jobs) {
    try {
      await job()
    } catch (err) {
      console.error('[gc-expired] cleanup failed', { table: name, error: (err as Error).message })
    }
  }
}

export default defineNitroPlugin(() => {
  const g = globalThis as GlobalWithTimer
  if (g[TIMER_KEY]) {
    clearInterval(g[TIMER_KEY])
  }

  // Wait for the first interval so local dev migrations can finish first.
  const timer = setInterval(() => {
    void runOnce()
  }, SCAN_INTERVAL_MS)
  if (typeof timer.unref === 'function') timer.unref()
  g[TIMER_KEY] = timer
})
