import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isHostnameWithin, readLimitedText, safeFetch } from '../../../../server/utils/safe-fetch'

type PinnedLookup = (
  hostname: string,
  options: Record<string, unknown>,
  callback: (error: Error | null, address: string | Array<{ address: string, family: number }>, family?: number) => void
) => void

const networkMocks = vi.hoisted(() => ({
  agentOptions: null as { connect?: { lookup?: PinnedLookup } } | null,
  lookup: vi.fn()
}))

vi.mock('node:dns/promises', () => ({ lookup: networkMocks.lookup }))
vi.mock('undici', () => ({
  Agent: class {
    constructor(options: { connect?: { lookup?: PinnedLookup } }) {
      networkMocks.agentOptions = options
    }

    async close() {}
  },
  fetch: (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)
}))

beforeEach(() => {
  networkMocks.agentOptions = null
  networkMocks.lookup.mockImplementation(async (hostname: string) => [{
    address: hostname,
    family: hostname.includes(':') ? 6 : 4
  }])
})

afterEach(() => {
  vi.restoreAllMocks()
})

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
    })).rejects.toThrow('upstream URL must use HTTP or HTTPS')
  })

  it('rejects loopback and private network destinations', async () => {
    await expect(safeFetch('https://127.0.0.1/resource', {
      allowedHosts: ['127.0.0.1']
    })).rejects.toThrow('upstream hostname resolved to a blocked network')

    await expect(safeFetch('https://10.0.0.1/resource', {
      allowedHosts: ['10.0.0.1']
    })).rejects.toThrow('upstream hostname resolved to a blocked network')

    networkMocks.lookup.mockResolvedValueOnce([{
      address: '::ffff:7f00:1',
      family: 6
    }])
    await expect(safeFetch('https://[::ffff:7f00:1]/resource', {
      allowedHosts: ['[::ffff:7f00:1]']
    })).rejects.toThrow('upstream hostname resolved to a blocked network')
  })

  it('pins the verified DNS address for the connection', async () => {
    networkMocks.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const pinnedLookup = networkMocks.agentOptions?.connect?.lookup
      expect(pinnedLookup).toBeTypeOf('function')

      const resolved = await new Promise<{ address: string, family: number }>((resolve, reject) => {
        pinnedLookup?.('example.com', {}, (error, address, family) => {
          if (error) reject(error)
          else if (typeof address === 'string' && family) resolve({ address, family })
          else reject(new Error('expected one pinned address'))
        })
      })
      expect(resolved).toEqual({ address: '93.184.216.34', family: 4 })

      const resolvedAll = await new Promise<Array<{ address: string, family: number }>>((resolve, reject) => {
        pinnedLookup?.('example.com', { all: true }, (error, addresses) => {
          if (error) reject(error)
          else if (Array.isArray(addresses)) resolve(addresses)
          else reject(new Error('expected all pinned addresses'))
        })
      })
      expect(resolvedAll).toEqual([{ address: '93.184.216.34', family: 4 }])
      expect((init as RequestInit & { dispatcher?: unknown }).dispatcher).toBeDefined()
      return new Response('ok')
    })

    await expect(safeFetch('https://example.com/resource', {
      allowedHosts: ['example.com']
    })).resolves.toBeInstanceOf(Response)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('allows a public IPv4-mapped IPv6 destination', async () => {
    networkMocks.lookup.mockResolvedValueOnce([{
      address: '::ffff:5db8:d822',
      family: 6
    }])
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('ok'))

    await expect(safeFetch('https://[::ffff:5db8:d822]/resource', {
      allowedHosts: ['::ffff:5db8:d822']
    })).resolves.toBeInstanceOf(Response)
    expect(networkMocks.lookup).toHaveBeenCalledWith(
      '::ffff:5db8:d822',
      { all: true, verbatim: true }
    )
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

describe('readLimitedText', () => {
  it('rejects response bodies larger than the configured limit', async () => {
    const response = new Response('12345')
    await expect(readLimitedText(response, 4)).rejects.toThrow('upstream response is too large')
  })
})
