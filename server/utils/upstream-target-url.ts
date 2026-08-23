import { isIP } from 'node:net'
import { ipInAnyCidr } from '#shared/utils/cidr'
import { createApplicationError } from '~~/server/errors/application-error'

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
  if (normalized === 'localhost' || !normalized.includes('.')) return true
  if (normalized.endsWith('.localhost') || normalized.endsWith('.local') || normalized.endsWith('.internal')) return true
  return isIP(normalized) > 0 && ipInAnyCidr(normalized, PRIVATE_NETWORKS)
}

export function normalizeUpstreamTargetUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    throw createApplicationError({
      statusCode: 400,
      message: 'upstream target URL is invalid',
      data: { code: 'UPSTREAM_URL_INVALID' }
    })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw createApplicationError({
      statusCode: 400,
      message: 'upstream target must use HTTP or HTTPS',
      data: { code: 'UPSTREAM_PROTOCOL_INVALID' }
    })
  }
  if (url.username || url.password || url.search || url.hash) {
    throw createApplicationError({
      statusCode: 400,
      message: 'upstream target must not contain credentials, query, or fragment',
      data: { code: 'UPSTREAM_URL_INVALID' }
    })
  }
  if (url.protocol === 'http:' && !isPrivateUpstreamHostname(url.hostname)) {
    throw createApplicationError({
      statusCode: 400,
      message: 'public upstream targets must use HTTPS',
      data: { code: 'PUBLIC_UPSTREAM_REQUIRES_HTTPS' }
    })
  }
  url.pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')
  return url
}
