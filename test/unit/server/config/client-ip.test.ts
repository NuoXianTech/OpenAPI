import { describe, expect, it } from 'vitest'
import { parseRuntimeClientIpConfig } from '~~/server/config/client-ip'

describe('runtime client IP configuration', () => {
  it('uses database settings when no proxy environment override is configured', () => {
    expect(parseRuntimeClientIpConfig({
      source: '',
      trustedCidrs: '',
      forwardedHops: 1
    })).toBeNull()
  })

  it('keeps legacy trusted CIDR deployments in X-Forwarded-For mode', () => {
    expect(parseRuntimeClientIpConfig({
      trustedCidrs: '127.0.0.1/32,::1/128',
      forwardedHops: '2'
    })).toEqual({
      source: 'x_forwarded_for',
      trustedProxyCidrs: ['127.0.0.1/32', '::1/128'],
      forwardedHops: 2,
      managedBy: 'environment',
      safeFallback: false
    })
  })

  it('accepts Cloudflare aliases and universal IPv4/IPv6 ranges', () => {
    expect(parseRuntimeClientIpConfig({
      source: 'cf',
      trustedCidrs: '0.0.0.0/0,::/0'
    })).toMatchObject({
      source: 'cloudflare',
      trustedProxyCidrs: ['0.0.0.0/0', '::/0']
    })
  })

  it('lets explicit direct mode ignore leftover proxy values', () => {
    expect(parseRuntimeClientIpConfig({
      source: 'direct',
      trustedCidrs: 'invalid'
    })).toMatchObject({ source: 'direct', trustedProxyCidrs: [] })
  })

  it('rejects unsafe or malformed proxy overrides', () => {
    expect(() => parseRuntimeClientIpConfig({ source: 'xff', trustedCidrs: '' }))
      .toThrow('NUXT_PROXY_TRUSTED_CIDRS is required')
    expect(() => parseRuntimeClientIpConfig({ source: 'xff', trustedCidrs: 'invalid' }))
      .toThrow('contains invalid IP/CIDR entries')
    expect(() => parseRuntimeClientIpConfig({
      source: 'xff',
      trustedCidrs: '127.0.0.1/32',
      forwardedHops: 11
    })).toThrow('between 1 and 10')
  })
})
