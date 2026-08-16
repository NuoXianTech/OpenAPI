import { describe, expect, it } from 'vitest'
import type { RateLimiter } from '~~/server/types/api-access'
import { canConsumeIdentityRateLimit } from '~~/server/utils/rate-limit/identity'

function createRecordingLimiter(keys: string[], deniedKey?: string): RateLimiter {
  return {
    name: 'memory',
    async consume(key, limit, window) {
      keys.push(`${key}:${limit}:${window}`)
      return {
        allowed: key !== deniedKey,
        remaining: key === deniedKey ? 0 : limit,
        resetAtMs: Date.now() + 60_000,
        limit,
        window
      }
    }
  }
}

describe('canConsumeIdentityRateLimit', () => {
  it('normalizes and checks all available identity buckets', async () => {
    const keys: string[] = []
    const allowed = await canConsumeIdentityRateLimit({
      limiter: createRecordingLimiter(keys),
      namespace: 'login',
      buckets: [
        { name: 'account', value: 'USER@Example.COM', limit: 5, window: 'minute' },
        { name: 'ip', value: '127.0.0.1', limit: 30, window: 'minute' },
        { name: 'optional', value: null, limit: 1, window: 'hour' }
      ]
    })

    expect(allowed).toBe(true)
    expect(keys).toEqual([
      'login:account:user@example.com:5:minute',
      'login:ip:127.0.0.1:30:minute'
    ])
  })

  it('returns false when any identity bucket is denied', async () => {
    const allowed = await canConsumeIdentityRateLimit({
      limiter: createRecordingLimiter([], 'register:ip:127.0.0.1'),
      namespace: 'register',
      buckets: [
        { name: 'email', value: 'user@example.com', limit: 1, window: 'minute' },
        { name: 'ip', value: '127.0.0.1', limit: 10, window: 'hour' }
      ]
    })

    expect(allowed).toBe(false)
  })
})
