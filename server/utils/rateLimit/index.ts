/**
 * 限流 driver 工厂。
 *
 * driver 选择优先级：
 *   1. 显式配置：`runtimeConfig.apiGuard.rateLimitDriver`（可在 nuxt.config.ts 设定，
 *      或通过 Nuxt 标准的 NUXT_API_GUARD_RATE_LIMIT_DRIVER 环境变量覆盖）
 *   2. 自动判断：NuxtHub 部署（检测到 NUXT_HUB_PROJECT_KEY）→ kv；否则 → memory
 *
 * 各 driver 适用场景：
 *   - memory（默认）：进程内计数，dev / 单实例 prod
 *   - postgres：基于 api_rate_limit_buckets 表的原子 upsert，多实例 Node 部署
 *   - kv：基于 Nitro `useStorage('cache')`，NuxtHub / Cloudflare / Vercel 等 serverless
 *
 * driver 在运行时抛错时由上层（apiGuard）按 fail-open 策略处理。
 */

import type { RateLimitDriverName } from '~~/shared/config/apiGuard'
import { RATE_LIMIT_DRIVERS } from '~~/shared/config/apiGuard'
import type { RateLimiter } from '~~/shared/types/api-guard'
import { kvRateLimiter } from './kv'
import { memoryRateLimiter } from './memory'
import { postgresRateLimiter } from './postgres'

let current: RateLimiter | null = null

function autoDetectDriver(): RateLimitDriverName {
  // NuxtHub 部署时由平台注入此 key；以此判定走 KV 共享存储
  if (process.env.NUXT_HUB_PROJECT_KEY) return 'kv'
  return 'memory'
}

export function getRateLimiter(): RateLimiter {
  if (current) return current
  const config = useRuntimeConfig()
  const explicit = (config.apiGuard?.rateLimitDriver ?? '').toString().trim().toLowerCase()
  const isKnown = (RATE_LIMIT_DRIVERS as readonly string[]).includes(explicit)
  const driver = (isKnown ? explicit : autoDetectDriver()) as RateLimitDriverName
  current = resolveDriver(driver)
  return current
}

function resolveDriver(name: RateLimitDriverName): RateLimiter {
  switch (name) {
    case 'postgres':
      return postgresRateLimiter
    case 'kv':
      return kvRateLimiter
    case 'memory':
    default:
      return memoryRateLimiter
  }
}
