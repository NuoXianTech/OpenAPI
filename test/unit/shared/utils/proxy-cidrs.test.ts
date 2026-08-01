import { describe, expect, it } from 'vitest'
import { parseTrustedProxyCidrs } from '#shared/utils/proxy-cidrs'

describe('trusted proxy CIDR parsing', () => {
  it('accepts individual IPv4 and IPv6 addresses and normalizes exact masks', () => {
    const parsed = parseTrustedProxyCidrs('127.0.0.1, 2001:db8::1\n10.0.0.0/8')

    expect(parsed.invalidEntries).toEqual([])
    expect(parsed.cidrs).toEqual([
      '127.0.0.1/32',
      '2001:db8::1/128',
      '10.0.0.0/8'
    ])
    expect(parsed.normalized).toBe('127.0.0.1/32\n2001:db8::1/128\n10.0.0.0/8')
  })

  it('supports all IPv4 and all IPv6 ranges', () => {
    const parsed = parseTrustedProxyCidrs('203.0.113.10/0\n2001:db8::1/0')

    expect(parsed.invalidEntries).toEqual([])
    expect(parsed.trustsAllIpv4).toBe(true)
    expect(parsed.trustsAllIpv6).toBe(true)
  })

  it('rejects unspecified literals without a CIDR mask and malformed entries', () => {
    const parsed = parseTrustedProxyCidrs('0.0.0.0\n::\nnot-an-ip')

    expect(parsed.cidrs).toEqual([])
    expect(parsed.invalidEntries).toEqual(['0.0.0.0', '::', 'not-an-ip'])
  })

  it('deduplicates normalized entries', () => {
    expect(parseTrustedProxyCidrs('127.0.0.1 127.0.0.1/32').cidrs).toEqual(['127.0.0.1/32'])
  })
})
