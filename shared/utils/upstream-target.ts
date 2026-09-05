import { getIpAddressFamily, ipInAnyCidr } from './cidr'

const PRIVATE_NETWORKS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '::/128',
  '::1/128',
  'fc00::/7',
  'fe80::/10'
] as const

function normalizedHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
}

export function isPrivateUpstreamHostname(hostname: string): boolean {
  const normalized = normalizedHostname(hostname)
  const family = getIpAddressFamily(normalized)
  if (family !== null) return ipInAnyCidr(normalized, PRIVATE_NETWORKS)

  if (
    normalized === 'localhost'
    || !normalized.includes('.')
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
    || normalized.endsWith('.internal')
  ) return true
  return false
}

type UpstreamTargetUrlIssue
  = | 'invalid'
    | 'protocol'
    | 'restricted'
    | 'publicHttp'

export interface UpstreamTargetUrlValidation {
  url: URL | null
  issue: UpstreamTargetUrlIssue | null
}

export function validateUpstreamTargetUrl(value: string): UpstreamTargetUrlValidation {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return { url: null, issue: 'invalid' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { url: null, issue: 'protocol' }
  }
  if (url.username || url.password || url.search || url.hash) {
    return { url: null, issue: 'restricted' }
  }
  if (url.protocol === 'http:' && !isPrivateUpstreamHostname(url.hostname)) {
    return { url: null, issue: 'publicHttp' }
  }
  return { url, issue: null }
}
