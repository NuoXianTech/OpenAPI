import { describe, expect, it } from 'vitest'
import { assertLoginRateLimit } from '~~/server/utils/loginRateLimit'
import type { RateLimiter } from '~~/shared/types/api-guard'

function createDenyingLimiter(): RateLimiter {
  return {
    name: 'memory',
    async consume(_key, limit, window) {
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: Date.now() + 60_000,
        limit,
        window
      }
    }
  }
}

function createRecordingLimiter(keys: string[]): RateLimiter {
  return {
    name: 'memory',
    async consume(key, limit, window) {
      keys.push(`${key}:${limit}:${window}`)
      return {
        allowed: true,
        remaining: limit,
        resetAtMs: Date.now() + 60_000,
        limit,
        window
      }
    }
  }
}

describe('assertLoginRateLimit', () => {
  it('checks account and ip buckets, then surfaces limiter denials as 429', async () => {
    const keys: string[] = []

    await assertLoginRateLimit({
      limiter: createRecordingLimiter(keys),
      namespace: 'login',
      account: 'USER@Example.COM',
      ip: '127.0.0.1',
      accountLimit: 5,
      ipLimit: 20
    })

    expect(keys).toEqual([
      'login:account:user@example.com:5:minute',
      'login:ip:127.0.0.1:20:minute'
    ])

    await expect(assertLoginRateLimit({
      limiter: createDenyingLimiter(),
      namespace: 'admin-login',
      account: 'root',
      ip: '127.0.0.1',
      accountLimit: 5,
      ipLimit: 20
    })).rejects.toMatchObject({ statusCode: 429 })
  })
})
