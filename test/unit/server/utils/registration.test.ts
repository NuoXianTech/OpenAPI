import { describe, expect, it } from 'vitest'
import {
  isEmailAllowedForRegistration,
  normalizeEmailFilterMode,
  parseEmailDomainList
} from '~~/server/utils/registration'

describe('registration email policy', () => {
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
