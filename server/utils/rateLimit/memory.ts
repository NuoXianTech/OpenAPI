/**
 * 进程内内存限流 · 固定窗口计数。
 *
 * 适用：dev / 单实例 prod。
 * 不适用：多实例（各实例计数独立，无法共享）。
 *
 * 使用 Map 保存 bucket，LRU 限制在 10k 条，防止 key 爆炸导致内存泄漏。
 * 过期窗口由惰性清理 + 定时清理（每 60s）共同保障。
 */

import { RATE_LIMIT_WINDOW_SECONDS } from '~~/shared/config/apiGuard'
import type { RateLimitResult, RateLimiter } from '~~/shared/types/api-guard'
import type { RateLimitWindow } from '~~/shared/config/apiGuard'

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
    // 粗粒度剔除：删除前 1/4（Map 保持插入顺序，前面多半是较旧的）
    const toDelete = Math.ceil(buckets.size / 4)
    let i = 0
    for (const k of buckets.keys()) {
      if (i++ >= toDelete) break
      buckets.delete(k)
    }
  }
}

export const memoryRateLimiter: RateLimiter = {
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
