import { describe, expect, it } from 'vitest'
import {
  firstQueryValue,
  readQueryDate,
  readQueryNumber,
  readQueryOption,
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
      '?keyword=music&apikey=secret&access_token=access&API-KEY=second&keyword=video'
    )
    const query = new URLSearchParams(sanitized ?? '')

    expect(query.getAll('keyword')).toEqual(['music', 'video'])
    expect(query.get('apikey')).toBe('[REDACTED]')
    expect(query.get('access_token')).toBe('[REDACTED]')
    expect(query.get('API-KEY')).toBe('[REDACTED]')
    expect(sanitized).not.toContain('secret')
    expect(sanitizeQueryStringForLog('')).toBeNull()
  })
})
