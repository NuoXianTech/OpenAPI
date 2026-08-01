import { describe, expect, it } from 'vitest'
import {
  getSecurityHeaders,
  isHtmlDocumentRoute,
  isPlayerHtmlRoute
} from '~~/server/utils/security-headers'

describe('security headers', () => {
  it('creates restrictive production application headers', () => {
    const headers = getSecurityHeaders({
      isProduction: true,
      isPlayerRoute: false,
      isHtmlRoute: true
    })

    expect(headers['Content-Security-Policy']).toContain(`frame-ancestors 'none'`)
    expect(headers['Content-Security-Policy']).toContain('https://challenges.cloudflare.com')
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['X-Frame-Options']).toBe('DENY')
  })

  it('allows the same-origin Nuxt DevTools frame only in development', () => {
    const developmentHeaders = getSecurityHeaders({
      isProduction: false,
      isPlayerRoute: false,
      isHtmlRoute: true
    })
    const productionHeaders = getSecurityHeaders({
      isProduction: true,
      isPlayerRoute: false,
      isHtmlRoute: true
    })

    expect(developmentHeaders['Content-Security-Policy'])
      .toContain(`frame-src 'self' https://challenges.cloudflare.com`)
    expect(productionHeaders['Content-Security-Policy'])
      .toContain('frame-src https://challenges.cloudflare.com')
    expect(productionHeaders['Content-Security-Policy'])
      .not.toContain(`frame-src 'self'`)
  })

  it('allows the dedicated player document to be embedded', () => {
    const headers = getSecurityHeaders({
      isProduction: true,
      isPlayerRoute: true,
      isHtmlRoute: true
    })

    expect(headers['Content-Security-Policy']).toContain('frame-ancestors *')
    expect(headers['Content-Security-Policy']).toContain('media-src blob: http: https:')
    expect(headers['X-Frame-Options']).toBeUndefined()
  })

  it('reuses immutable header variants', () => {
    const options = {
      isProduction: false,
      isPlayerRoute: false,
      isHtmlRoute: false
    }
    const headers = getSecurityHeaders(options)

    expect(getSecurityHeaders(options)).toBe(headers)
    expect(Object.isFrozen(headers)).toBe(true)
  })

  it('keeps API and asset responses lightweight', () => {
    const headers = getSecurityHeaders({
      isProduction: true,
      isPlayerRoute: false,
      isHtmlRoute: false
    })

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['Content-Security-Policy']).toBeUndefined()
    expect(headers['Permissions-Policy']).toBeUndefined()
    expect(headers['Cross-Origin-Opener-Policy']).toBeUndefined()
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
    expect(isHtmlDocumentRoute('/v1/bing')).toBe(false)
    expect(isHtmlDocumentRoute('/v1/not-found')).toBe(false)
    expect(isHtmlDocumentRoute('/v1/player')).toBe(true)
    expect(isHtmlDocumentRoute('/v2/player/art/')).toBe(true)
  })
})
