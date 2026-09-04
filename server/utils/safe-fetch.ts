import { lookup } from 'node:dns/promises'
import { isIP, type LookupFunction } from 'node:net'
import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from 'undici'
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
const DNS_LOOKUP_TIMEOUT_MS = 2_000
type ResolvedAddress = { address: string, family: number }

export interface SafeFetchOptions extends RequestInit {
  allowedHosts: readonly string[]
  maxRedirects?: number
  allowHttp?: boolean
  allowPrivateNetworks?: boolean
  allowNonDefaultPort?: boolean
  /** Allow subdomains of entries in allowedHosts (default: true). */
  allowSubdomains?: boolean
  /** Follow validated redirects (default: true). */
  followRedirects?: boolean
}

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '')
}

export function isHostnameWithin(hostname: string, allowedHost: string): boolean {
  const normalizedHostname = normalizeHostname(hostname)
  const normalizedAllowedHost = normalizeHostname(allowedHost)
  return normalizedHostname === normalizedAllowedHost
    || normalizedHostname.endsWith(`.${normalizedAllowedHost}`)
}

function assertAllowedHostname(
  hostname: string,
  allowedHosts: readonly string[],
  allowSubdomains: boolean
): void {
  const normalizedHostname = normalizeHostname(hostname)
  if (!allowedHosts.some((allowedHost) => {
    const normalizedAllowedHost = normalizeHostname(allowedHost)
    return normalizedHostname === normalizedAllowedHost
      || (allowSubdomains && normalizedHostname.endsWith(`.${normalizedAllowedHost}`))
  })) {
    throw new Error('upstream hostname is not allowed')
  }
}

function assertPublicAddress(address: string): void {
  if (!isIP(address) || ipInAnyCidr(address, BLOCKED_NETWORKS)) {
    throw new Error('upstream hostname resolved to a blocked network')
  }
}

async function lookupAddresses(hostname: string): Promise<ResolvedAddress[]> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('upstream DNS lookup timed out')),
          DNS_LOOKUP_TIMEOUT_MS
        )
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function assertSafeUrl(
  input: string | URL,
  allowedHosts: readonly string[],
  pinnedAddresses: Map<string, ResolvedAddress[]>,
  options: Pick<SafeFetchOptions, 'allowHttp' | 'allowPrivateNetworks' | 'allowNonDefaultPort' | 'allowSubdomains'>
): Promise<URL> {
  const url = input instanceof URL ? new URL(input) : new URL(input)
  if (url.protocol !== 'https:' && !(options.allowHttp && url.protocol === 'http:')) {
    throw new Error('upstream URL must use HTTP or HTTPS')
  }
  if (url.username || url.password) throw new Error('upstream URL credentials are not allowed')
  if (
    url.port
    && !options.allowNonDefaultPort
    && ((url.protocol === 'https:' && url.port !== '443')
      || (url.protocol === 'http:' && url.port !== '80'))
  ) throw new Error('upstream URL port is not allowed')

  assertAllowedHostname(url.hostname, allowedHosts, options.allowSubdomains ?? true)

  const hostname = normalizeHostname(url.hostname)
  const addresses = await lookupAddresses(hostname)
  if (addresses.length === 0) throw new Error('upstream hostname did not resolve')
  if (!options.allowPrivateNetworks) {
    for (const { address } of addresses) assertPublicAddress(address)
  }
  pinnedAddresses.set(hostname, addresses)

  return url
}

function createPinnedDispatcher(pinnedAddresses: Map<string, ResolvedAddress[]>) {
  const pinnedLookup: LookupFunction = (hostname, options, callback) => {
    const addresses = pinnedAddresses.get(normalizeHostname(hostname))
    const matchingAddresses = addresses?.filter(address => !options.family || address.family === options.family) ?? []
    if (matchingAddresses.length === 0) {
      callback(new Error('upstream hostname has no verified address'), '', 0)
      return
    }
    if (options.all) {
      callback(null, matchingAddresses)
      return
    }
    const selected = matchingAddresses[0]!
    callback(null, selected.address, selected.family)
  }

  return new Agent({ connect: { lookup: pinnedLookup } })
}

const CREDENTIAL_HEADERS = [
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
  'api-key',
  'x-auth-token'
] as const

function redirectedRequestInit(
  status: number,
  options: RequestInit,
  previousUrl: URL,
  nextUrl: URL
): RequestInit {
  const method = (options.method || 'GET').toUpperCase()
  let nextOptions = options
  if (status === 303 || ((status === 301 || status === 302) && method === 'POST')) {
    const headers = new Headers(options.headers)
    headers.delete('content-length')
    headers.delete('content-type')
    nextOptions = { ...options, method: 'GET', body: undefined, headers }
  }

  // A redirect can cross an origin even when both hosts are in the configured
  // allow-list (for example `service.example.com` -> `evil.service.example.com`).
  // Never forward caller credentials to a different origin.
  if (previousUrl.origin !== nextUrl.origin) {
    const headers = new Headers(nextOptions.headers)
    for (const name of CREDENTIAL_HEADERS) headers.delete(name)
    nextOptions = { ...nextOptions, headers }
  }
  return nextOptions
}

export async function safeFetch(input: string | URL, options: SafeFetchOptions): Promise<Response> {
  const {
    allowedHosts,
    maxRedirects = 5,
    allowHttp = false,
    allowPrivateNetworks = false,
    allowNonDefaultPort = false,
    allowSubdomains = true,
    followRedirects = true,
    ...requestOptions
  } = options
  const pinnedAddresses = new Map<string, ResolvedAddress[]>()
  const urlOptions = { allowHttp, allowPrivateNetworks, allowNonDefaultPort, allowSubdomains }
  let currentUrl = await assertSafeUrl(input, allowedHosts, pinnedAddresses, urlOptions)
  let currentOptions: RequestInit = { ...requestOptions, redirect: 'manual' }
  const dispatcher = createPinnedDispatcher(pinnedAddresses)

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      const response = await undiciFetch(currentUrl, {
        ...currentOptions,
        dispatcher
      } as unknown as UndiciRequestInit)
      if (!REDIRECT_STATUS_CODES.has(response.status) || !followRedirects) {
        void dispatcher.close()
        return response as unknown as Response
      }

      const location = response.headers.get('location')
      if (!location) {
        void dispatcher.close()
        return response as unknown as Response
      }
      if (redirectCount === maxRedirects) {
        await response.body?.cancel()
        throw new Error('upstream redirect limit exceeded')
      }

      const nextUrl = await assertSafeUrl(
        new URL(location, currentUrl),
        allowedHosts,
        pinnedAddresses,
        urlOptions
      )
      await response.body?.cancel()
      currentOptions = redirectedRequestInit(
        response.status,
        currentOptions,
        currentUrl,
        nextUrl
      )
      currentUrl = nextUrl
    }

    throw new Error('upstream redirect limit exceeded')
  } catch (error) {
    await dispatcher.close()
    throw error
  }
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
