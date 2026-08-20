import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signAccessToken, verifyAccessToken } from '~~/server/utils/jwt'
import { issueVerificationTokenUrl, verifyVerificationToken } from '~~/server/utils/verification-token'

const AUTH_SECRET = 'unit-test-auth-secret-32-bytes!!'

describe('authentication tokens', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T12:00:00.000Z'))
    vi.stubGlobal('useRuntimeConfig', () => ({ auth: { secret: AUTH_SECRET } }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('signs and verifies strict HS256 access tokens', () => {
    const token = signAccessToken({
      sub: 7,
      role: 'admin',
      ver: 3,
      loginAt: 1_700_000_000,
      rmb: false
    }, 60)
    const [header] = token.split('.')

    expect(JSON.parse(Buffer.from(header!, 'base64url').toString('utf8'))).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect(verifyAccessToken(token)).toMatchObject({ sub: 7, role: 'admin', ver: 3 })
    expect(verifyAccessToken(`${token.slice(0, -1)}x`)).toBeNull()

    vi.advanceTimersByTime(61_000)
    expect(verifyAccessToken(token)).toBeNull()
  })

  it('rejects malformed access-token session claims', () => {
    const invalidVersion = signAccessToken({
      sub: 7,
      role: 'admin',
      ver: -1,
      loginAt: 1_700_000_000,
      rmb: false
    }, 60)
    const invalidRememberMe = signAccessToken({
      sub: 7,
      role: 'admin',
      ver: 1,
      loginAt: 1_700_000_000,
      rmb: 'yes' as never
    }, 60)

    expect(verifyAccessToken(invalidVersion)).toBeNull()
    expect(verifyAccessToken(invalidRememberMe)).toBeNull()
  })

  it('keeps verification tokens bound to the current user state', () => {
    const user = { id: 9, email: 'user@example.com', tokenVersion: 2 }
    const url = issueVerificationTokenUrl(user, {
      siteUrl: 'https://example.com/',
      path: '/reset-password',
      purpose: 'reset_password',
      email: user.email,
      expiresInMinutes: 30
    })
    const token = new URL(url).searchParams.get('token')!

    expect(verifyVerificationToken(token, user, 'reset_password')).toMatchObject({
      uid: user.id,
      email: user.email,
      purpose: 'reset_password'
    })
    expect(verifyVerificationToken(token, { ...user, id: 10 }, 'reset_password')).toBeNull()
    expect(verifyVerificationToken(token, { ...user, tokenVersion: 3 }, 'reset_password')).toBeNull()
    expect(verifyVerificationToken(token, user, 'verify')).toBeNull()
  })
})
