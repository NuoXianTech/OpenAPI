import { describe, expect, it } from 'vitest'
import { ipInAnyCidr, ipInCidr, isCidr } from '#shared/utils/cidr'

describe('CIDR utilities', () => {
  it('validates IPv4 and IPv6 CIDR notation', () => {
    expect(isCidr('192.168.1.0/24')).toBe(true)
    expect(isCidr('2001:db8::/32')).toBe(true)
    expect(isCidr('192.168.1.1')).toBe(false)
    expect(isCidr('192.168.1.0/33')).toBe(false)
    expect(isCidr('2001:db8::/129')).toBe(false)
    expect(isCidr('192.168.001.0/24')).toBe(false)
  })

  it('matches addresses within IPv4 and IPv6 networks', () => {
    expect(ipInCidr('192.168.1.42', '192.168.1.0/24')).toBe(true)
    expect(ipInCidr('192.168.2.42', '192.168.1.0/24')).toBe(false)
    expect(ipInCidr('2001:db8::42', '2001:db8::/32')).toBe(true)
    expect(ipInCidr('2001:db9::42', '2001:db8::/32')).toBe(false)
  })

  it('matches IPv4-mapped IPv6 addresses against IPv4 networks', () => {
    expect(ipInCidr('::ffff:192.168.1.42', '192.168.1.0/24')).toBe(true)
  })

  it('treats an empty whitelist as unrestricted', () => {
    expect(ipInAnyCidr(null, [])).toBe(true)
    expect(ipInAnyCidr('10.0.0.5', ['10.0.0.0/8'])).toBe(true)
    expect(ipInAnyCidr('192.168.1.5', ['10.0.0.0/8'])).toBe(false)
  })
})
