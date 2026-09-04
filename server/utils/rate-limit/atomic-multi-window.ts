import { RATE_LIMIT_WINDOW_SECONDS, type RateLimitWindow } from '~~/server/config/api-access'
import type { RateLimiter, RateLimitResult } from '~~/server/types/api-access'
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

interface CreateAtomicMultiWindowRateLimiterOptions {
  client: RedisEvalClient
  config: Pick<RedisConfig, 'keyPrefix' | 'required'>
  fallback: RateLimiter
  hashKey?: (key: string) => string
  now?: () => number
}

/**
 * Lua script that atomically checks and increments all rate limit windows.
 * Returns an array of counts for each window after increment.
 * If any window would exceed its limit, none are incremented.
 */
const ATOMIC_MULTI_WINDOW_SCRIPT = `
local results = {}
local limits = {}
local expirations = {}

-- Parse window configurations from ARGV
-- Format: limit1 expiration1 limit2 expiration2 ...
for i = 1, #ARGV, 2 do
  table.insert(limits, tonumber(ARGV[i]))
  table.insert(expirations, tonumber(ARGV[i + 1]))
end

-- First pass: check all windows
for i = 1, #KEYS do
  local count = tonumber(redis.call('GET', KEYS[i]) or "0")
  if count >= limits[i] then
    -- At least one window would be denied; return current counts without incrementing
    table.insert(results, 0)
    for j = 1, #KEYS do
      table.insert(results, tonumber(redis.call('GET', KEYS[j]) or "0"))
    end
    return results
  end
end

-- Second pass: all checks passed, increment all windows atomically
table.insert(results, 1)
for i = 1, #KEYS do
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then
    redis.call('PEXPIREAT', KEYS[i], expirations[i])
  end
  table.insert(results, count)
end

return results
`

function alignWindow(nowMs: number, windowSeconds: number): number {
  const windowMs = windowSeconds * 1_000
  return Math.floor(nowMs / windowMs) * windowMs
}

function defaultHashKey(key: string): string {
  return createHmacSignature(key, getAuthSecret())
}

function parseRedisResult(value: unknown, expectedLength: number): {
  consumed: boolean
  counts: number[]
} {
  if (!Array.isArray(value) || value.length !== expectedLength + 1) {
    throw new Error('Redis multi-window rate limiter returned unexpected result')
  }

  const consumedMarker = Number(value[0])
  if (consumedMarker !== 0 && consumedMarker !== 1) {
    throw new Error('Redis multi-window rate limiter returned invalid status')
  }

  const counts = value.slice(1).map((item) => {
    const count = Number(item)
    if (!Number.isInteger(count) || count < 0) {
      throw new Error('Redis multi-window rate limiter returned invalid count')
    }
    return count
  })

  return { consumed: consumedMarker === 1, counts }
}

function getWindowSeconds(window: RateLimitWindow): number {
  const seconds = RATE_LIMIT_WINDOW_SECONDS[window]
  if (typeof seconds !== 'number') {
    throw new Error(`Invalid rate limit window: ${window}`)
  }
  return seconds
}

export function createAtomicMultiWindowRateLimiter(
  options: CreateAtomicMultiWindowRateLimiterOptions
): RateLimiter {
  let hasLoggedFallback = false

  return {
    name: 'redis-atomic-multi-window',
    async consume(key, limit, window) {
      const windowSeconds = getWindowSeconds(window)
      const nowMs = options.now?.() ?? Date.now()
      const windowStart = alignWindow(nowMs, windowSeconds)
      const resetAtMs = windowStart + windowSeconds * 1_000

      if (limit <= 0) {
        return {
          allowed: true,
          remaining: Number.MAX_SAFE_INTEGER,
          resetAtMs,
          limit,
          window
        } satisfies RateLimitResult
      }

      // This is a single-window fallback when called directly.
      // The multi-window orchestration happens in the access service.
      const hashedKey = (options.hashKey ?? defaultHashKey)(key)
      const redisKey = `${options.config.keyPrefix}rate-limit:${window}:${windowStart}:${hashedKey}`

      try {
        const { consumed, counts } = parseRedisResult(
          await options.client.eval(
            ATOMIC_MULTI_WINDOW_SCRIPT,
            1,
            redisKey,
            String(limit),
            String(resetAtMs)
          ),
          1
        )
        const count = counts[0]!
        return {
          allowed: consumed && count <= limit,
          remaining: Math.max(limit - count, 0),
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

/**
 * Check and consume multiple rate limit windows atomically.
 * All windows are checked first; only if all pass are any incremented.
 */
export async function consumeMultiWindowAtomic(
  client: RedisEvalClient,
  config: Pick<RedisConfig, 'keyPrefix'>,
  baseKey: string,
  windows: Array<{ window: RateLimitWindow, limit: number }>,
  options: { hashKey?: (key: string) => string, now?: () => number } = {}
): Promise<RateLimitResult[]> {
  const nowMs = options.now?.() ?? Date.now()
  const hashKey = options.hashKey ?? defaultHashKey

  const keys: string[] = []
  const args: string[] = []
  const results: RateLimitResult[] = []

  for (const { window, limit } of windows) {
    const windowSeconds = getWindowSeconds(window)
    const windowStart = alignWindow(nowMs, windowSeconds)
    const resetAtMs = windowStart + windowSeconds * 1_000
    // The existing sequential limiter hashes a key that already contains the
    // window name. Keep the atomic path byte-for-byte compatible so changing
    // between one and multiple configured windows does not reset counters.
    const hashedKey = hashKey(`${baseKey}:${window}`)
    const redisKey = `${config.keyPrefix}rate-limit:${window}:${windowStart}:${hashedKey}`

    keys.push(redisKey)
    args.push(String(limit), String(resetAtMs))

    results.push({
      allowed: true,
      remaining: limit,
      resetAtMs,
      limit,
      window
    })
  }

  if (keys.length === 0) return []

  let consumed: boolean
  let counts: number[]
  try {
    ({ consumed, counts } = parseRedisResult(
      await client.eval(ATOMIC_MULTI_WINDOW_SCRIPT, keys.length, ...keys, ...args),
      keys.length
    ))
  } catch (error) {
    // EVAL may have committed before its response was lost. Classify every
    // failure as unavailable so callers fail closed instead of retrying the
    // same non-idempotent consumption through the sequential path.
    throw createRedisUnavailableError('限流服务暂不可用，请稍后再试', error)
  }

  for (let i = 0; i < results.length; i++) {
    const count = counts[i]!
    const limit = results[i]!.limit
    // A successful consume may legitimately reach the limit. On a denied
    // consume, a count at the limit is the window that blocked the request.
    results[i]!.allowed = consumed ? count <= limit : count < limit
    results[i]!.remaining = Math.max(limit - count, 0)
  }

  return results
}

let atomicMultiWindowRateLimiter: RateLimiter | null = null
let atomicMultiWindowRateLimiterFingerprint = ''

export function getAtomicMultiWindowRateLimiter(fallback: RateLimiter): RateLimiter | null {
  const config = getRedisConfig()
  const client = getRedisClient()
  if (!client) return null

  const fingerprint = `${config.url}|${config.keyPrefix}|${config.required}`
  if (!atomicMultiWindowRateLimiter || atomicMultiWindowRateLimiterFingerprint !== fingerprint) {
    atomicMultiWindowRateLimiterFingerprint = fingerprint
    atomicMultiWindowRateLimiter = createAtomicMultiWindowRateLimiter({ client, config, fallback })
  }
  return atomicMultiWindowRateLimiter
}
