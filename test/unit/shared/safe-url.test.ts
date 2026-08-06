import { describe, expect, it } from 'vitest'
import { isSafePublicUrl, isSafeSiteOrigin } from '#shared/utils/safe-url'

describe('safe public URLs', () => {
  it('allows HTTP(S) URLs and explicitly permitted relative paths', () => {
    expect(isSafePublicUrl('https://example.com/docs')).toBe(true)
    expect(isSafePublicUrl('http://example.com')).toBe(true)
    expect(isSafePublicUrl('/internal/docs', { allowRelative: true })).toBe(true)
    expect(isSafePublicUrl('/internal/docs')).toBe(false)
  })

  it('rejects executable schemes, protocol-relative URLs, and credentials', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html,blocked', '//evil.com', '/\\evil.com', 'https://user:pass@example.com']) {
      expect(isSafePublicUrl(value, { allowRelative: true }), value).toBe(false)
    }
  })
})

describe('safe site origins', () => {
  it('only accepts a bare HTTP(S) origin', () => {
    expect(isSafeSiteOrigin('https://example.com')).toBe(true)
    expect(isSafeSiteOrigin('https://example.com/')).toBe(true)
    for (const value of [
      'https://example.com/docs',
      'https://example.com?tenant=1',
      'https://example.com/#home',
      'https://user:pass@example.com',
      'javascript:alert(1)'
    ]) {
      expect(isSafeSiteOrigin(value), value).toBe(false)
    }
  })
})
