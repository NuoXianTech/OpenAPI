import { describe, expect, it } from 'vitest'
import { sanitizeGatewayResponseHeaders } from '~~/server/utils/gateway-response-headers'

describe('sanitizeGatewayResponseHeaders', () => {
  it('keeps business headers and strips control-plane, cookie, and CORS headers', () => {
    const source = new Headers({
      'content-type': 'application/json',
      'cache-control': 'public, max-age=60',
      'x-business-version': 'v1',
      'set-cookie': 'session=secret',
      'access-control-allow-origin': '*',
      'content-security-policy': 'default-src \'none\'',
      'connection': 'keep-alive',
      'x-request-id': 'attacker-request-id',
      'x-ratelimit-limit': '1',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1',
      'x-ratelimit-window': 'second',
      'retry-after': '3600',
      'x-forwarded-for': '198.51.100.10',
      'forwarded': 'for=198.51.100.10',
      'x-openapi-route-id': 'forged-route'
    })

    const result = sanitizeGatewayResponseHeaders(source)

    expect(result.get('content-type')).toBe('application/json')
    expect(result.get('cache-control')).toBe('public, max-age=60')
    expect(result.get('x-business-version')).toBe('v1')
    expect(result.has('set-cookie')).toBe(false)
    expect(result.has('access-control-allow-origin')).toBe(false)
    expect(result.has('content-security-policy')).toBe(false)
    expect(result.has('connection')).toBe(false)
    expect(result.has('x-request-id')).toBe(false)
    expect(result.has('x-ratelimit-limit')).toBe(false)
    expect(result.has('retry-after')).toBe(false)
    expect(result.has('x-forwarded-for')).toBe(false)
    expect(result.has('forwarded')).toBe(false)
    expect(result.has('x-openapi-route-id')).toBe(false)
  })
})
