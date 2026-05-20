import { lt } from 'drizzle-orm'
import { apiRateLimitBuckets } from '@nuxthub/db/schema'
import { RATE_LIMIT_WINDOW_SECONDS } from '~~/shared/config/apiGuard'

const MAX_WINDOW_SECONDS = Math.max(...Object.values(RATE_LIMIT_WINDOW_SECONDS))
const SAFETY_BUFFER_SECONDS = 3_600

export const apiRateLimitService = {
  async cleanupExpired() {
    const cutoff = new Date(Date.now() - (MAX_WINDOW_SECONDS + SAFETY_BUFFER_SECONDS) * 1_000)
    await db.delete(apiRateLimitBuckets).where(lt(apiRateLimitBuckets.windowStart, cutoff))
  }
}
