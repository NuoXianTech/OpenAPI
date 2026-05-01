/**
 * KV 限流 driver · 基于 Nitro `useStorage('cache')` 的固定窗口计数。
 *
 * 适用：NuxtHub / Cloudflare / Vercel 等 serverless 部署；多实例之间通过共享 KV 计数。
 *
 * 后端由 Nitro 的 `cache` mount 决定：
 *   - 本地 dev：默认走 unstorage 内存/文件 driver（单实例，作为 fallback 仍可用）
 *   - NuxtHub：在 nuxt.config.ts 设置 `hub.cache: true` 后自动映射到 Cloudflare KV
 *   - 自定义：通过 `nitro.storage.cache.driver` 指定 redis / upstash / vercel-kv 等
 *
 * 注意：unstorage 的 setItem/getItem 不是原子操作，存在毫秒级竞争窗口；
 *       高 QPS 下可能略微超刷，严格限流场景请改用 'postgres' driver。
 */

import { RATE_LIMIT_WINDOW_SECONDS } from '~~/shared/config/apiGuard'
import type { RateLimitResult, RateLimiter } from '~~/shared/types/api-guard'

function alignWindow(nowMs: number, windowSec: number) {
  const windowMs = windowSec * 1_000
  return Math.floor(nowMs / windowMs) * windowMs
}

export const kvRateLimiter: RateLimiter = {
  name: 'kv',
  async consume(key, limit, window) {
    const windowSec = RATE_LIMIT_WINDOW_SECONDS[window]
    const now = Date.now()
    const windowStartMs = alignWindow(now, windowSec)
    const resetAtMs = windowStartMs + windowSec * 1_000

    const storage = useStorage('cache')
    const storageKey = `rl:${key}|${window}|${windowStartMs}`
    const existing = Number((await storage.getItem(storageKey)) ?? 0)
    const nextCount = existing + 1
    // ttl 略大于窗口，避免边界过期；Cloudflare KV / Redis 等 driver 会读取 ttl 参数
    await storage.setItem(storageKey, nextCount, { ttl: windowSec + 5 })

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
