import { describe, expect, it } from 'vitest'
import type { EffectiveClientIpConfig } from '#shared/types/client-ip'
import { resolveClientIp } from '~~/server/utils/client-ip'

function config(
  source: EffectiveClientIpConfig['source'],
  trustedProxyCidrs: string[] = [],
  forwardedHops = 1
) {
  return {
    source,
    trustedProxyCidrs,
    forwardedHops
  }
}

describe('client IP resolution', () => {
  it('always ignores forwarded headers in direct mode', () => {
    expect(resolveClientIp({
      peerIp: '198.51.100.10',
      xForwardedFor: '203.0.113.99',
      cfConnectingIp: '203.0.113.98',
      config: config('direct', ['0.0.0.0/0'])
    })).toMatchObject({
      clientIp: '198.51.100.10',
      reason: 'direct'
    })
  })

  it('does not treat an empty trusted list as trusting every peer', () => {
    expect(resolveClientIp({
      peerIp: '198.51.100.10',
      xForwardedFor: '203.0.113.99',
      config: config('x_forwarded_for')
    })).toMatchObject({
      clientIp: '198.51.100.10',
      reason: 'untrusted_proxy'
    })
  })

  it('reads Cloudflare IPv4 and IPv6 headers only from trusted peers', () => {
    expect(resolveClientIp({
      peerIp: '2001:db8::10',
      cfConnectingIp: '2001:db8:ffff::42',
      config: config('cloudflare', ['::/0'])
    })).toMatchObject({
      clientIp: '2001:db8:ffff::42',
      reason: 'trusted_proxy'
    })

    expect(resolveClientIp({
      peerIp: '198.51.100.10',
      cfConnectingIp: '203.0.113.42',
      config: config('cloudflare', ['10.0.0.0/8'])
    })).toMatchObject({ clientIp: '198.51.100.10', reason: 'untrusted_proxy' })
  })

  it('selects X-Forwarded-For addresses from the right by trusted hop count', () => {
    expect(resolveClientIp({
      peerIp: '127.0.0.1',
      xForwardedFor: '203.0.113.42, 10.0.0.2',
      config: config('x_forwarded_for', ['127.0.0.1/32'], 2)
    })).toMatchObject({
      clientIp: '203.0.113.42',
      reason: 'trusted_proxy'
    })
  })

  it('rejects malformed or insufficient X-Forwarded-For chains without shifting hops', () => {
    expect(resolveClientIp({
      peerIp: '127.0.0.1',
      xForwardedFor: '203.0.113.42, unknown, 10.0.0.2',
      config: config('x_forwarded_for', ['127.0.0.1/32'], 2)
    })).toMatchObject({ clientIp: '127.0.0.1', reason: 'invalid_header' })

    expect(resolveClientIp({
      peerIp: '127.0.0.1',
      xForwardedFor: '203.0.113.42',
      config: config('x_forwarded_for', ['127.0.0.1/32'], 2)
    })).toMatchObject({ clientIp: '127.0.0.1', reason: 'insufficient_forwarded_hops' })
  })
})
