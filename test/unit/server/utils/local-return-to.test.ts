import { describe, expect, it } from 'vitest'
import { normalizeLocalReturnTo } from '~~/server/utils/local-return-to'

describe('normalizeLocalReturnTo', () => {
  it('keeps local paths with query and hash', () => {
    expect(normalizeLocalReturnTo('/user/settings?tab=security#oauth'))
      .toBe('/user/settings?tab=security#oauth')
  })

  it.each([
    'https://evil.example/path',
    '//evil.example/path',
    '/\\evil.example/path',
    '/%5cevil.example/path',
    '/path%0d%0aLocation:%20https://evil.example'
  ])('rejects unsafe redirect target %s', (value) => {
    expect(normalizeLocalReturnTo(value)).toBe('/')
  })
})
