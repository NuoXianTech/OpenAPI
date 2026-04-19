/**
 * Postgres 限流 driver · 固定窗口计数。
 *
 * 实现：按 (bucketKey, windowStart) 做 upsert 原子累加 count。
 * 适用多实例部署。性能：每次请求一次 INSERT ... ON CONFLICT UPDATE（微秒~毫秒级）。
 *
 * 清理：过期桶由外部定时任务 / cron 删除（见 apiRateLimitService.cleanupExpired）。
 * 若清理滞后，表体积膨胀也只影响 UNIQUE 索引尺寸，不影响单次 upsert 性能。
 */

import { sql } from 'drizzle-orm'
import { apiRateLimitBuckets } from '@nuxthub/db/schema'
import { RATE_LIMIT_WINDOW_SECONDS } from '~~/shared/config/apiGuard'
import type { RateLimitResult, RateLimiter } from '~~/shared/types/api-guard'

function alignWindow(nowMs: number, windowSec: number) {
  const windowMs = windowSec * 1_000
  return Math.floor(nowMs / windowMs) * windowMs
}

export const postgresRateLimiter: RateLimiter = {
  name: 'postgres',
  async consume(key, limit, window) {
    const windowSec = RATE_LIMIT_WINDOW_SECONDS[window]
    const now = Date.now()
    const windowStartMs = alignWindow(now, windowSec)
    const windowStart = new Date(windowStartMs)
    const resetAtMs = windowStartMs + windowSec * 1_000

    const rows = await db.insert(apiRateLimitBuckets).values({
      bucketKey: key,
      windowStart,
      count: 1,
    }).onConflictDoUpdate({
      target: [apiRateLimitBuckets.bucketKey, apiRateLimitBuckets.windowStart],
      set: {
        count: sql`${apiRateLimitBuckets.count} + 1`,
        updatedAt: new Date(),
      },
    }).returning({ count: apiRateLimitBuckets.count })

    const nextCount = rows[0]?.count ?? 1
    const allowed = limit <= 0 ? true : nextCount <= limit

    return {
      allowed,
      remaining: limit <= 0 ? Number.MAX_SAFE_INTEGER : Math.max(limit - nextCount, 0),
      resetAtMs,
      limit,
      window,
    } satisfies RateLimitResult
  },
}
