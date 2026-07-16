import { describe, expect, it } from 'vitest'
import { isHostnameWithin, readLimitedText, safeFetch } from '../../../../server/utils/safe-fetch'

describe('isHostnameWithin', () => {
  it('accepts the configured hostname and its subdomains', () => {
    expect(isHostnameWithin('example.com', 'example.com')).toBe(true)
    expect(isHostnameWithin('api.example.com', 'example.com')).toBe(true)
    expect(isHostnameWithin('API.EXAMPLE.COM.', 'example.com')).toBe(true)
  })

  it('rejects hostname suffix tricks', () => {
    expect(isHostnameWithin('example.com.evil.test', 'example.com')).toBe(false)
    expect(isHostnameWithin('notexample.com', 'example.com')).toBe(false)
    expect(isHostnameWithin('example.com@evil.test', 'example.com')).toBe(false)
  })
})

describe('safeFetch', () => {
  it('rejects non-HTTPS URLs before making a request', async () => {
    await expect(safeFetch('http://example.com/resource', {
      allowedHosts: ['example.com']
    })).rejects.toThrow('upstream URL must use HTTPS')
  })

  it('rejects loopback and private network destinations', async () => {
    await expect(safeFetch('https://127.0.0.1/resource', {
      allowedHosts: ['127.0.0.1']
    })).rejects.toThrow('upstream hostname resolved to a blocked network')

    await expect(safeFetch('https://10.0.0.1/resource', {
      allowedHosts: ['10.0.0.1']
    })).rejects.toThrow('upstream hostname resolved to a blocked network')
  })
})

describe('readLimitedText', () => {
  it('rejects response bodies larger than the configured limit', async () => {
    const response = new Response('12345')
    await expect(readLimitedText(response, 4)).rejects.toThrow('upstream response is too large')
  })
})
