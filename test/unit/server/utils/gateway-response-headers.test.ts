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
      'connection': 'keep-alive'
    })

    const result = sanitizeGatewayResponseHeaders(source)

    expect(result.get('content-type')).toBe('application/json')
    expect(result.get('cache-control')).toBe('public, max-age=60')
    expect(result.get('x-business-version')).toBe('v1')
    expect(result.has('set-cookie')).toBe(false)
    expect(result.has('access-control-allow-origin')).toBe(false)
    expect(result.has('content-security-policy')).toBe(false)
    expect(result.has('connection')).toBe(false)
  })
})
