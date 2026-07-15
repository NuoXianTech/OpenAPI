import { describe, expect, it } from 'vitest'
import {
  createSecurityHeaders,
  isHtmlDocumentRoute,
  isPlayerHtmlRoute
} from '~~/server/utils/security-headers'

describe('security headers', () => {
  it('creates restrictive production application headers', () => {
    const headers = createSecurityHeaders({
      isProduction: true,
      isPlayerRoute: false,
      isHtmlRoute: true
    })

    expect(headers['Content-Security-Policy']).toContain(`frame-ancestors 'none'`)
    expect(headers['Content-Security-Policy']).toContain('https://challenges.cloudflare.com')
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['X-Frame-Options']).toBe('DENY')
  })

  it('allows the dedicated player document to be embedded', () => {
    const headers = createSecurityHeaders({
      isProduction: true,
      isPlayerRoute: true,
      isHtmlRoute: true
    })

    expect(headers['Content-Security-Policy']).toContain('frame-ancestors *')
    expect(headers['Content-Security-Policy']).toContain('media-src blob: http: https:')
    expect(headers['X-Frame-Options']).toBeUndefined()
  })

  it('classifies document and player routes', () => {
    expect(isPlayerHtmlRoute('/v1/player')).toBe(true)
    expect(isPlayerHtmlRoute('/v1/player/art')).toBe(true)
    expect(isPlayerHtmlRoute('/v1/music')).toBe(false)
    expect(isHtmlDocumentRoute('/')).toBe(true)
    expect(isHtmlDocumentRoute('/admin/users')).toBe(true)
    expect(isHtmlDocumentRoute('/api/health')).toBe(false)
    expect(isHtmlDocumentRoute('/_nuxt/app.js')).toBe(false)
  })
})
