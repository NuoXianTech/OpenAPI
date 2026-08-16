import { describe, expect, it } from 'vitest'
import {
  getSecurityHeaders,
  isHtmlDocumentRoute
} from '~~/server/utils/security-headers'

describe('security headers', () => {
  it('creates restrictive production application headers', () => {
    const headers = getSecurityHeaders({
      isProduction: true,
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
      isHtmlRoute: true
    })
    const productionHeaders = getSecurityHeaders({
      isProduction: true,
      isHtmlRoute: true
    })

    expect(developmentHeaders['Content-Security-Policy'])
      .toContain(`frame-src 'self' https://challenges.cloudflare.com`)
    expect(productionHeaders['Content-Security-Policy'])
      .toContain('frame-src https://challenges.cloudflare.com')
    expect(productionHeaders['Content-Security-Policy'])
      .not.toContain(`frame-src 'self'`)
  })

  it('reuses immutable header variants', () => {
    const options = {
      isProduction: false,
      isHtmlRoute: false
    }
    const headers = getSecurityHeaders(options)

    expect(getSecurityHeaders(options)).toBe(headers)
    expect(Object.isFrozen(headers)).toBe(true)
  })

  it('keeps API and asset responses lightweight', () => {
    const headers = getSecurityHeaders({
      isProduction: true,
      isHtmlRoute: false
    })

    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
    expect(headers['Content-Security-Policy']).toBeUndefined()
    expect(headers['Permissions-Policy']).toBeUndefined()
    expect(headers['Cross-Origin-Opener-Policy']).toBeUndefined()
    expect(headers['X-Frame-Options']).toBeUndefined()
  })

  it('classifies only Platform pages as HTML documents', () => {
    expect(isHtmlDocumentRoute('/')).toBe(true)
    expect(isHtmlDocumentRoute('/admin/users')).toBe(true)
    expect(isHtmlDocumentRoute('/api/health')).toBe(false)
    expect(isHtmlDocumentRoute('/_nuxt/app.js')).toBe(false)
    expect(isHtmlDocumentRoute('/v1/bing')).toBe(false)
    expect(isHtmlDocumentRoute('/v1/not-found')).toBe(false)
    expect(isHtmlDocumentRoute('/v1/player')).toBe(false)
    expect(isHtmlDocumentRoute('/v2/player/art/')).toBe(false)
  })
})
