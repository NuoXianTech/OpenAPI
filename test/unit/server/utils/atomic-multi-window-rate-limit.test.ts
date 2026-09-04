import { describe, expect, it, vi } from 'vitest'
import type { RateLimiter } from '~~/server/types/api-access'
import { consumeMultiWindowAtomic } from '~~/server/utils/rate-limit/atomic-multi-window'
import { createRedisRateLimiter } from '~~/server/utils/rate-limit/redis'

const baseKey = 'route:route-id:apikey:key-id'
const windows = [
  { window: 'second' as const, limit: 5 },
  { window: 'minute' as const, limit: 20 }
]

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

describe('atomic multi-window Redis rate limiter', () => {
  it('uses the same Redis keys as the established sequential path', async () => {
    const now = () => 61_000
    const hashKey = (key: string) => `digest(${key})`
    const sequentialEval = vi.fn(async () => 1)
    const sequentialLimiter = createRedisRateLimiter({
      client: { eval: sequentialEval },
      config: { keyPrefix: 'openapi:', required: true },
      fallback: createFallbackLimiter(),
      hashKey,
      now
    })

    for (const item of windows) {
      await sequentialLimiter.consume(
        `${baseKey}:${item.window}`,
        item.limit,
        item.window
      )
    }

    const atomicEval = vi.fn(async () => [1, 1, 1])
    await consumeMultiWindowAtomic(
      { eval: atomicEval },
      { keyPrefix: 'openapi:' },
      baseKey,
      windows,
      { hashKey, now }
    )

    const sequentialKeys = sequentialEval.mock.calls.map(call => call[2])
    const atomicCall = atomicEval.mock.calls[0]!
    expect(atomicCall.slice(2, 2 + windows.length)).toEqual(sequentialKeys)
  })

  it('distinguishes a denied request from one that reaches the limit', async () => {
    const denied = await consumeMultiWindowAtomic(
      { eval: vi.fn(async () => [0, 5, 2]) },
      { keyPrefix: 'openapi:' },
      baseKey,
      windows,
      { hashKey: key => key, now: () => 61_000 }
    )
    const consumed = await consumeMultiWindowAtomic(
      { eval: vi.fn(async () => [1, 5, 2]) },
      { keyPrefix: 'openapi:' },
      baseKey,
      windows,
      { hashKey: key => key, now: () => 61_000 }
    )

    expect(denied.map(result => result.allowed)).toEqual([false, true])
    expect(consumed.map(result => result.allowed)).toEqual([true, true])
  })

  it('wraps ambiguous EVAL failures so callers do not retry consumption', async () => {
    await expect(consumeMultiWindowAtomic(
      { eval: vi.fn(async () => { throw new Error('reply lost') }) },
      { keyPrefix: 'openapi:' },
      baseKey,
      windows,
      { hashKey: key => key, now: () => 61_000 }
    )).rejects.toMatchObject({
      code: 'REDIS_UNAVAILABLE',
      statusCode: 503
    })
  })
})
