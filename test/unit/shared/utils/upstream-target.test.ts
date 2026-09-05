import { describe, expect, it } from 'vitest'
import { isPrivateUpstreamHostname } from '#shared/utils/upstream-target'

describe('isPrivateUpstreamHostname', () => {
  it('accepts private DNS names and private IP ranges', () => {
    expect(isPrivateUpstreamHostname('openapi-service')).toBe(true)
    expect(isPrivateUpstreamHostname('10.0.0.8')).toBe(true)
    expect(isPrivateUpstreamHostname('::1')).toBe(true)
  })

  it('does not classify public IP addresses as private', () => {
    expect(isPrivateUpstreamHostname('8.8.8.8')).toBe(false)
    expect(isPrivateUpstreamHostname('2001:4860:4860::8888')).toBe(false)
  })

  it('accepts internal DNS suffixes but rejects public HTTP hostnames', () => {
    expect(isPrivateUpstreamHostname('service.internal')).toBe(true)
    expect(isPrivateUpstreamHostname('api.example.com')).toBe(false)
  })
})
