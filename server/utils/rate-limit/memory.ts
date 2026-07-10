/**
 * In-process fixed-window rate limiter for the single Node server process.
 * Counters are intentionally memory-only and reset when the process restarts.
 */

import { RATE_LIMIT_WINDOW_SECONDS } from '~~/server/config/api-guard'
import type { RateLimitResult, RateLimiter } from '~~/server/types/api-guard'
import type { RateLimitWindow } from '~~/server/config/api-guard'

interface Bucket {
  windowStart: number
  count: number
  expiresAt: number
}

const MAX_BUCKETS = 10_000
const CLEANUP_INTERVAL_MS = 60_000

const buckets = new Map<string, Bucket>()
let lastCleanupAt = 0

function bucketKey(key: string, window: RateLimitWindow, windowStart: number) {
  return `${key}|${window}|${windowStart}`
}

function alignWindow(nowMs: number, windowSec: number) {
  const windowMs = windowSec * 1_000
  return Math.floor(nowMs / windowMs) * windowMs
}

function cleanup(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now
  for (const [k, b] of buckets) {
    if (b.expiresAt <= now) buckets.delete(k)
  }
  if (buckets.size > MAX_BUCKETS) {
    const toDelete = Math.ceil(buckets.size / 4)
    let i = 0
    for (const k of buckets.keys()) {
      if (i++ >= toDelete) break
      buckets.delete(k)
    }
  }
}

const memoryRateLimiter: RateLimiter = {
  name: 'memory',
  async consume(key, limit, window) {
    const windowSec = RATE_LIMIT_WINDOW_SECONDS[window]
    const now = Date.now()
    cleanup(now)

    const windowStart = alignWindow(now, windowSec)
    const resetAtMs = windowStart + windowSec * 1_000
    const bk = bucketKey(key, window, windowStart)

    const existing = buckets.get(bk)
    const nextCount = (existing?.count ?? 0) + 1
    buckets.set(bk, { windowStart, count: nextCount, expiresAt: resetAtMs })

    const allowed = limit <= 0 ? true : nextCount <= limit
    return {
      allowed,
      remaining: limit <= 0 ? Number.MAX_SAFE_INTEGER : Math.max(limit - nextCount, 0),
      resetAtMs,
      limit,
      window
    } satisfies RateLimitResult
  }
}

export function getMemoryRateLimiter(): RateLimiter {
  return memoryRateLimiter
}
