import type { H3Event } from 'h3'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookieState = vi.hoisted(() => ({ values: new Map<string, string>() }))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    getCookie: (_event: H3Event, name: string) => cookieState.values.get(name),
    setCookie: (
      _event: H3Event,
      name: string,
      value: string,
      options?: { maxAge?: number }
    ) => {
      if (options?.maxAge === 0) cookieState.values.delete(name)
      else cookieState.values.set(name, value)
    }
  }
})

vi.stubGlobal('useRuntimeConfig', () => ({
  auth: { secret: 'oauth-cookie-expiry-test-secret-32-bytes' }
}))

const { consumeState, issueState } = await import('~~/server/utils/oauth-state')
const { issuePendingOauth, readPendingOauth } = await import(
  '~~/server/utils/oauth-pending'
)

const event = {} as H3Event

beforeEach(() => {
  cookieState.values.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-17T00:00:00.000Z'))
})

afterEach(() => vi.useRealTimers())
afterAll(() => vi.unstubAllGlobals())

describe('OAuth cookie payload expiry', () => {
  it('accepts a valid state once and rejects it after its signed expiry', () => {
    const valid = issueState(event, 'github', '/admin/apis')
    expect(consumeState(event, 'github', valid.state)).toMatchObject({
      provider: 'github',
      returnTo: '/admin/apis',
      mode: 'login'
    })
    expect(consumeState(event, 'github', valid.state)).toBeNull()

    const expired = issueState(event, 'github', '/')
    vi.advanceTimersByTime(5 * 60 * 1000 + 1_000)
    expect(consumeState(event, 'github', expired.state)).toBeNull()
  })

  it('rejects a signed pending profile after its embedded expiry', () => {
    issuePendingOauth(event, {
      provider: 'github',
      providerUserId: 'oauth-user-1',
      email: 'oauth@example.com',
      nickname: 'OAuth user',
      avatarUrl: null
    })
    expect(readPendingOauth(event)).toMatchObject({
      provider: 'github',
      providerUserId: 'oauth-user-1'
    })

    vi.advanceTimersByTime(10 * 60 * 1000 + 1_000)
    expect(readPendingOauth(event)).toBeNull()
  })
})
