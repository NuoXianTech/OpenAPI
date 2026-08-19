import { describe, expect, it } from 'vitest'
import {
  isRegistrationInviteValid,
  isEmailAllowedForRegistration,
  normalizeEmailFilterMode,
  normalizeRegistrationMode,
  parseEmailDomainList
} from '~~/server/utils/registration'

describe('registration email policy', () => {
  it('normalizes registration modes and validates invitation codes', () => {
    expect(normalizeRegistrationMode('open')).toBe('open')
    expect(normalizeRegistrationMode('invite')).toBe('invite')
    expect(normalizeRegistrationMode('closed')).toBe('closed')
    expect(normalizeRegistrationMode('unexpected')).toBe('open')

    expect(isRegistrationInviteValid('site-invite-2026', 'site-invite-2026'))
      .toBe(true)
    expect(isRegistrationInviteValid('site-invite-2026', ' site-invite-2026 '))
      .toBe(true)
    expect(isRegistrationInviteValid('site-invite-2026', 'wrong-code'))
      .toBe(false)
    expect(isRegistrationInviteValid('', 'site-invite-2026')).toBe(false)
    expect(isRegistrationInviteValid('site-invite-2026', undefined)).toBe(false)
  })

  it('normalizes configured domains and ignores comments', () => {
    expect(parseEmailDomainList('@Example.com, blocked.test\n# comment\n')).toEqual([
      'example.com',
      'blocked.test'
    ])
  })

  it('applies whitelist and blacklist modes to the domain only', () => {
    const domains = ['example.com']

    expect(normalizeEmailFilterMode('invalid')).toBe('off')
    expect(isEmailAllowedForRegistration('User@Example.com', 'whitelist', domains)).toBe(true)
    expect(isEmailAllowedForRegistration('user@sub.example.com', 'whitelist', domains)).toBe(false)
    expect(isEmailAllowedForRegistration('user@example.com', 'blacklist', domains)).toBe(false)
    expect(isEmailAllowedForRegistration('user@allowed.test', 'blacklist', domains)).toBe(true)
    expect(isEmailAllowedForRegistration('invalid', 'whitelist', domains)).toBe(false)
  })
})
