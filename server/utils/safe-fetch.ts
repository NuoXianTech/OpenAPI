import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { ipInAnyCidr } from '#shared/utils/cidr'

const BLOCKED_NETWORKS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '::/128',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
  'ff00::/8',
  '2001:db8::/32'
] as const

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])

export interface SafeFetchOptions extends RequestInit {
  allowedHosts: readonly string[]
  maxRedirects?: number
}

export function isHostnameWithin(hostname: string, allowedHost: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, '')
  const normalizedAllowedHost = allowedHost.toLowerCase().replace(/\.$/, '')
  return normalizedHostname === normalizedAllowedHost
    || normalizedHostname.endsWith(`.${normalizedAllowedHost}`)
}

function assertAllowedHostname(hostname: string, allowedHosts: readonly string[]): void {
  if (!allowedHosts.some(allowedHost => isHostnameWithin(hostname, allowedHost))) {
    throw new Error('upstream hostname is not allowed')
  }
}

function assertPublicAddress(address: string): void {
  if (!isIP(address) || ipInAnyCidr(address, BLOCKED_NETWORKS)) {
    throw new Error('upstream hostname resolved to a blocked network')
  }
}

async function assertSafeUrl(input: string | URL, allowedHosts: readonly string[]): Promise<URL> {
  const url = input instanceof URL ? new URL(input) : new URL(input)
  if (url.protocol !== 'https:') throw new Error('upstream URL must use HTTPS')
  if (url.username || url.password) throw new Error('upstream URL credentials are not allowed')
  if (url.port && url.port !== '443') throw new Error('upstream URL port is not allowed')

  assertAllowedHostname(url.hostname, allowedHosts)

  const addresses = await lookup(url.hostname, { all: true, verbatim: true })
  if (addresses.length === 0) throw new Error('upstream hostname did not resolve')
  for (const { address } of addresses) assertPublicAddress(address)

  return url
}

function redirectedRequestInit(status: number, options: RequestInit): RequestInit {
  const method = (options.method || 'GET').toUpperCase()
  if (status === 303 || ((status === 301 || status === 302) && method === 'POST')) {
    const headers = new Headers(options.headers)
    headers.delete('content-length')
    headers.delete('content-type')
    return { ...options, method: 'GET', body: undefined, headers }
  }
  return options
}

export async function safeFetch(input: string | URL, options: SafeFetchOptions): Promise<Response> {
  const { allowedHosts, maxRedirects = 5, ...requestOptions } = options
  let currentUrl = await assertSafeUrl(input, allowedHosts)
  let currentOptions: RequestInit = { ...requestOptions, redirect: 'manual' }

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetch(currentUrl, currentOptions)
    if (!REDIRECT_STATUS_CODES.has(response.status)) return response

    const location = response.headers.get('location')
    if (!location) return response
    if (redirectCount === maxRedirects) {
      await response.body?.cancel()
      throw new Error('upstream redirect limit exceeded')
    }

    const nextUrl = await assertSafeUrl(new URL(location, currentUrl), allowedHosts)
    await response.body?.cancel()
    currentOptions = redirectedRequestInit(response.status, currentOptions)
    currentUrl = nextUrl
  }

  throw new Error('upstream redirect limit exceeded')
}

export async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await response.body?.cancel()
    throw new Error('upstream response is too large')
  }
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let receivedBytes = 0
  let text = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      receivedBytes += value.byteLength
      if (receivedBytes > maxBytes) throw new Error('upstream response is too large')
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }
}
