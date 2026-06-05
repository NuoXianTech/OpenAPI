import type { RateLimiter } from '~~/shared/types/api-guard'
import { memoryRateLimiter } from './memory'

let current: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (current) return current
  current = memoryRateLimiter
  return current
}
