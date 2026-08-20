import { describe, expect, it } from 'vitest'
import {
  firstQueryValue,
  readQueryDate,
  readQueryNumber,
  readQueryOption,
  readQueryPositiveInteger,
  readRequiredQueryPositiveInteger,
  readQueryString,
  readQueryText,
  sanitizeQueryStringForLog
} from '~~/server/utils/request-query'

describe('request query utilities', () => {
  it('normalizes nested query arrays to the first value', () => {
    expect(firstQueryValue([['first'], 'second'])).toBe('first')
    expect(readQueryString(['alpha', 'beta'])).toBe('alpha')
  })

  it('normalizes nullable values and trimmed text', () => {
    expect(readQueryString(undefined)).toBe('')
    expect(readQueryString(null, 'fallback')).toBe('fallback')
    expect(readQueryText('  value  ')).toBe('value')
    expect(readQueryText('   ')).toBeUndefined()
  })

  it('parses finite numeric values', () => {
    expect(readQueryNumber('12.5')).toBe(12.5)
    expect(readQueryNumber(['9'])).toBe(9)
    expect(readQueryNumber('')).toBeUndefined()
    expect(readQueryNumber('many')).toBeUndefined()
    expect(readQueryNumber(Number.POSITIVE_INFINITY)).toBeUndefined()
  })

  it('parses positive integer identifiers only', () => {
    expect(readQueryPositiveInteger('12')).toBe(12)
    expect(readQueryPositiveInteger('0')).toBeUndefined()
    expect(readQueryPositiveInteger('-1')).toBeUndefined()
    expect(readQueryPositiveInteger('1.5')).toBeUndefined()
    expect(readRequiredQueryPositiveInteger({ userId: '7' }, 'userId')).toBe(7)
    expect(() => readRequiredQueryPositiveInteger({ userId: '-7' }, 'userId')).toThrow('userId is required')
  })

  it('parses valid dates only', () => {
    expect(readQueryDate('2026-07-05T00:00:00.000Z')?.toISOString()).toBe('2026-07-05T00:00:00.000Z')
    expect(readQueryDate('not-a-date')).toBeUndefined()
  })

  it('accepts only whitelisted options', () => {
    const options = ['login', 'bind'] as const

    expect(readQueryOption('bind', options)).toBe('bind')
    expect(readQueryOption('logout', options)).toBeUndefined()
    expect(readQueryOption(' bind ', options)).toBe('bind')
  })

  it('redacts sensitive values before persisting query logs', () => {
    const sanitized = sanitizeQueryStringForLog(
      '?keyword=music&apikey=secret&access_token=access&password=plain&pwd=1234&API-KEY=second&url=https%3A%2F%2Fexample.com%2Fshare%3Fpwd%3Dnested%26page%3D1&keyword=video'
    )
    const query = new URLSearchParams(sanitized ?? '')

    expect(query.getAll('keyword')).toEqual(['music', 'video'])
    expect(query.get('apikey')).toBe('[REDACTED]')
    expect(query.get('access_token')).toBe('[REDACTED]')
    expect(query.get('password')).toBe('[REDACTED]')
    expect(query.get('pwd')).toBe('[REDACTED]')
    expect(query.get('API-KEY')).toBe('[REDACTED]')
    expect(query.get('url')).toBe('https://example.com/share?pwd=%5BREDACTED%5D&page=1')
    expect(sanitized).not.toContain('secret')
    expect(sanitized).not.toContain('plain')
    expect(sanitized).not.toContain('nested')
    expect(sanitizeQueryStringForLog('')).toBeNull()
  })
})
