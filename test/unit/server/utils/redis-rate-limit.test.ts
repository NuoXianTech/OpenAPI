import { describe, expect, it, vi } from 'vitest'
import type { RateLimiter } from '~~/server/types/api-guard'
import { createRedisRateLimiter } from '~~/server/utils/rate-limit/redis'

function createFallbackLimiter(): RateLimiter {
  return {
    name: 'memory',
    async consume(_key, limit, window) {
      return {
        allowed: true,
        remaining: limit,
        resetAtMs: 1,
        limit,
        window
      }
    }
  }
}

describe('Redis rate limiter', () => {
  it('skips Redis for unlimited windows', async () => {
    const evalCommand = vi.fn(async () => 1)
    const limiter = createRedisRateLimiter({
      client: { eval: evalCommand },
      config: { keyPrefix: 'openapi:', required: true },
      fallback: createFallbackLimiter(),
      now: () => 61_000
    })

    await expect(limiter.consume('public', 0, 'minute')).resolves.toEqual({
      allowed: true,
      remaining: Number.MAX_SAFE_INTEGER,
      resetAtMs: 120_000,
      limit: 0,
      window: 'minute'
    })
    expect(evalCommand).not.toHaveBeenCalled()
  })

  it('uses an opaque fixed-window key and returns the atomic count result', async () => {
    const evalCommand = vi.fn(async () => 2)
    const limiter = createRedisRateLimiter({
      client: { eval: evalCommand },
      config: { keyPrefix: 'openapi:', required: true },
      fallback: createFallbackLimiter(),
      hashKey: () => 'digest',
      now: () => 61_000
    })

    const result = await limiter.consume('login:account:user@example.com', 5, 'minute')

    expect(result).toEqual({
      allowed: true,
      remaining: 3,
      resetAtMs: 120_000,
      limit: 5,
      window: 'minute'
    })
    expect(evalCommand).toHaveBeenCalledWith(
      expect.stringContaining('PEXPIREAT'),
      1,
      'openapi:rate-limit:minute:60000:digest',
      '120000'
    )
    expect(String(evalCommand.mock.calls[0]?.[2])).not.toContain('user@example.com')
  })

  it('falls back to memory when Redis is optional', async () => {
    const fallback = createFallbackLimiter()
    const fallbackConsume = vi.spyOn(fallback, 'consume')
    const limiter = createRedisRateLimiter({
      client: { eval: vi.fn(async () => { throw new Error('offline') }) },
      config: { keyPrefix: 'openapi:', required: false },
      fallback,
      hashKey: key => key,
      now: () => 0
    })

    await expect(limiter.consume('login:ip:127.0.0.1', 10, 'minute')).resolves.toMatchObject({ allowed: true })
    expect(fallbackConsume).toHaveBeenCalledOnce()
  })

  it('fails closed when Redis is required', async () => {
    const limiter = createRedisRateLimiter({
      client: { eval: vi.fn(async () => { throw new Error('offline') }) },
      config: { keyPrefix: 'openapi:', required: true },
      fallback: createFallbackLimiter(),
      hashKey: key => key,
      now: () => 0
    })

    await expect(limiter.consume('login:ip:127.0.0.1', 10, 'minute')).rejects.toMatchObject({
      code: 'REDIS_UNAVAILABLE',
      statusCode: 503
    })
  })
})
