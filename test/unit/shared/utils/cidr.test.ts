import { describe, expect, it } from 'vitest'
import { getIpAddressFamily, ipInAnyCidr, ipInCidr, isCidr } from '#shared/utils/cidr'

describe('CIDR utilities', () => {
  it('validates IPv4 and IPv6 CIDR notation', () => {
    expect(isCidr('192.168.1.0/24')).toBe(true)
    expect(isCidr('2001:db8::/32')).toBe(true)
    expect(isCidr('0.0.0.0/0')).toBe(true)
    expect(isCidr('::/0')).toBe(true)
    expect(isCidr('192.168.1.1')).toBe(false)
    expect(isCidr('192.168.1.0/33')).toBe(false)
    expect(isCidr('2001:db8::/129')).toBe(false)
    expect(isCidr('192.168.001.0/24')).toBe(false)
    expect(isCidr('1:2:3:4:5:6:7:8::/128')).toBe(false)
  })

  it('matches addresses within IPv4 and IPv6 networks', () => {
    expect(ipInCidr('192.168.1.42', '192.168.1.0/24')).toBe(true)
    expect(ipInCidr('192.168.2.42', '192.168.1.0/24')).toBe(false)
    expect(ipInCidr('2001:db8::42', '2001:db8::/32')).toBe(true)
    expect(ipInCidr('2001:db9::42', '2001:db8::/32')).toBe(false)
    expect(ipInCidr('203.0.113.8', '0.0.0.0/0')).toBe(true)
    expect(ipInCidr('2001:db8:ffff::8', '::/0')).toBe(true)
  })

  it('identifies IPv4 and IPv6 literals', () => {
    expect(getIpAddressFamily('192.0.2.1')).toBe(4)
    expect(getIpAddressFamily('2001:db8::1')).toBe(6)
    expect(getIpAddressFamily('invalid')).toBeNull()
  })

  it('matches IPv4-mapped IPv6 addresses against IPv4 networks', () => {
    expect(ipInCidr('::ffff:192.168.1.42', '192.168.1.0/24')).toBe(true)
    expect(ipInCidr('::ffff:c0a8:12a', '192.168.1.0/24')).toBe(true)
    expect(ipInCidr('::ffff:5db8:d822', '10.0.0.0/8')).toBe(false)
  })

  it('treats an empty whitelist as unrestricted', () => {
    expect(ipInAnyCidr(null, [])).toBe(true)
    expect(ipInAnyCidr('10.0.0.5', ['10.0.0.0/8'])).toBe(true)
    expect(ipInAnyCidr('192.168.1.5', ['10.0.0.0/8'])).toBe(false)
  })
})
