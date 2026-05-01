/**
 * 限流 driver 工厂。
 *
 * 启动时根据 `runtimeConfig.apiGuard.rateLimitDriver` 选择实现：
 * - memory（默认）：进程内计数，适合 dev / 单实例
 * - postgres：共享 DB 计数，适合多实例
 * - nuxthub-kv：预留，部署到 NuxtHub 时使用（当前未实现）
 *
 * 若 driver 在运行时抛错，由上层（apiGuard）按 fail-open 策略处理。
 */

import type { RateLimitDriverName } from '~~/shared/config/apiGuard'
import type { RateLimiter } from '~~/shared/types/api-guard'
import { memoryRateLimiter } from './memory'
import { postgresRateLimiter } from './postgres'

let current: RateLimiter | null = null

export function getRateLimiter(): RateLimiter {
  if (current) return current
  const config = useRuntimeConfig()
  const driver = (config.apiGuard?.rateLimitDriver ?? 'memory') as RateLimitDriverName
  current = resolveDriver(driver)
  return current
}

function resolveDriver(name: RateLimitDriverName): RateLimiter {
  switch (name) {
    case 'postgres':
      return postgresRateLimiter
    case 'nuxthub-kv':
      console.warn('[api-guard] nuxthub-kv driver 尚未实现，回退到 memory')
      return memoryRateLimiter
    case 'memory':
    default:
      return memoryRateLimiter
  }
}
