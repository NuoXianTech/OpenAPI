import { RATE_LIMIT_WINDOW_SECONDS } from '~~/server/config/api-guard'
import type { RateLimiter, RateLimitResult } from '~~/server/types/api-guard'
import { getAuthSecret } from '~~/server/utils/auth-secret'
import { createHmacSignature } from '~~/server/utils/secure-token'
import {
  createRedisUnavailableError,
  getRedisClient,
  getRedisConfig,
  type RedisConfig
} from '~~/server/utils/redis'

interface RedisEvalClient {
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>
}

interface CreateRedisRateLimiterOptions {
  client: RedisEvalClient
  config: Pick<RedisConfig, 'keyPrefix' | 'required'>
  fallback: RateLimiter
  hashKey?: (key: string) => string
  now?: () => number
}

const FIXED_WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIREAT', KEYS[1], ARGV[1])
end
return count
`

function alignWindow(nowMs: number, windowSeconds: number): number {
  const windowMs = windowSeconds * 1_000
  return Math.floor(nowMs / windowMs) * windowMs
}

function defaultHashKey(key: string): string {
  return createHmacSignature(key, getAuthSecret())
}

function parseRedisCount(value: unknown): number {
  const count = Number(value)
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Redis rate limiter returned an invalid count')
  }
  return count
}

export function createRedisRateLimiter(options: CreateRedisRateLimiterOptions): RateLimiter {
  let hasLoggedFallback = false

  return {
    name: 'redis',
    async consume(key, limit, window) {
      const windowSeconds = RATE_LIMIT_WINDOW_SECONDS[window]
      const nowMs = options.now?.() ?? Date.now()
      const windowStart = alignWindow(nowMs, windowSeconds)
      const resetAtMs = windowStart + windowSeconds * 1_000
      const hashedKey = (options.hashKey ?? defaultHashKey)(key)
      const redisKey = `${options.config.keyPrefix}rate-limit:${window}:${windowStart}:${hashedKey}`

      try {
        const count = parseRedisCount(await options.client.eval(
          FIXED_WINDOW_SCRIPT,
          1,
          redisKey,
          String(resetAtMs)
        ))
        return {
          allowed: limit <= 0 || count <= limit,
          remaining: limit <= 0 ? Number.MAX_SAFE_INTEGER : Math.max(limit - count, 0),
          resetAtMs,
          limit,
          window
        } satisfies RateLimitResult
      } catch (error) {
        if (options.config.required) {
          throw createRedisUnavailableError('限流服务暂不可用，请稍后再试', error)
        }
        if (!hasLoggedFallback) {
          hasLoggedFallback = true
          console.warn('[rate-limit] Redis unavailable; falling back to process memory')
        }
        return options.fallback.consume(key, limit, window)
      }
    }
  }
}

let redisRateLimiter: RateLimiter | null = null
let redisRateLimiterFingerprint = ''

export function getRedisRateLimiter(fallback: RateLimiter): RateLimiter | null {
  const config = getRedisConfig()
  const client = getRedisClient()
  if (!client) return null

  const fingerprint = `${config.url}|${config.keyPrefix}|${config.required}`
  if (!redisRateLimiter || redisRateLimiterFingerprint !== fingerprint) {
    redisRateLimiterFingerprint = fingerprint
    redisRateLimiter = createRedisRateLimiter({ client, config, fallback })
  }
  return redisRateLimiter
}
