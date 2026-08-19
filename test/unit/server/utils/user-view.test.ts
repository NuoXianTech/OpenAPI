import { describe, expect, it } from 'vitest'
import { toAuthUser, toUserProfile } from '~~/server/utils/user-view'

const user = {
  id: 7,
  role: 'user',
  username: 'alice',
  displayName: 'Alice',
  email: 'Alice@example.com',
  passwordHash: 'secret-hash',
  locale: 'zh-CN',
  credits: 42,
  isActive: true,
  isBanned: false,
  bannedReason: 'internal reason',
  bannedUntil: null,
  lastLoginAt: new Date('2026-08-19T01:00:00.000Z'),
  lastLoginIp: '192.0.2.10',
  lastLoginUserAgent: 'test-agent',
  lastCheckinAt: null,
  emailVerifiedAt: new Date('2026-08-18T01:00:00.000Z'),
  tokenVersion: 4,
  createdAt: new Date('2026-08-17T01:00:00.000Z'),
  updatedAt: new Date('2026-08-19T01:00:00.000Z')
} as const

describe('user response views', () => {
  it('returns only the public authentication contract', () => {
    const result = toAuthUser(user)

    expect(Object.keys(result).sort()).toEqual([
      'avatarUrl',
      'displayName',
      'email',
      'id',
      'locale',
      'role',
      'username'
    ])
    expect(result).toMatchObject({
      id: 7,
      email: 'Alice@example.com',
      locale: 'zh-CN',
      role: 'user'
    })
    expect(result.avatarUrl).toMatch(/^https:\/\/cravatar\.cn\/avatar\/[a-f0-9]{32}$/)
  })

  it('returns a stable editable profile without database internals', () => {
    const result = toUserProfile(user)

    expect(Object.keys(result).sort()).toEqual([
      'avatarUrl',
      'createdAt',
      'displayName',
      'email',
      'emailVerifiedAt',
      'id',
      'locale',
      'username'
    ])
    expect(result.createdAt).toBe('2026-08-17T01:00:00.000Z')
    expect(result.emailVerifiedAt).toBe('2026-08-18T01:00:00.000Z')
  })
})
