import type { RateLimiter } from '~~/server/types/api-guard'
import { getMemoryRateLimiter } from '~~/server/utils/rate-limit/memory'
import { getRedisRateLimiter } from '~~/server/utils/rate-limit/redis'

export function getRateLimiter(): RateLimiter {
  const memoryRateLimiter = getMemoryRateLimiter()
  return getRedisRateLimiter(memoryRateLimiter) ?? memoryRateLimiter
}
