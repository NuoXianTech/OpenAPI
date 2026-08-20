import type { H3Event } from 'h3'
import { getHeader, setResponseHeaders } from 'h3'

const EXPOSED_HEADERS = [
  'ETag',
  'Location',
  'X-Request-Id',
  'X-OpenAPI-Error-Code',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'X-RateLimit-Window',
  'Retry-After'
].join(', ')

const DEFAULT_ALLOWED_REQUEST_HEADERS = ['content-type', 'x-api-key', 'x-request-id']
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9a-z-]+$/
const BLOCKED_REQUEST_HEADERS = new Set([
  'api-key',
  'authorization',
  'cookie',
  'forwarded',
  'host',
  'proxy-authorization',
  'true-client-ip',
  'x-auth-token',
  'x-real-ip'
])

export interface PublicApiCorsResult {
  rejectedRequestHeaders: string[]
}

function requestedHeaderNames(event: H3Event): string[] {
  const value = getHeader(event, 'access-control-request-headers')
  if (!value) return []
  return Array.from(new Set(value
    .split(',')
    .map(header => header.trim().toLowerCase())
    .filter(Boolean)))
}

function isBlockedRequestHeader(header: string): boolean {
  return !HEADER_NAME_PATTERN.test(header)
    || BLOCKED_REQUEST_HEADERS.has(header)
    || header.startsWith('cf-')
    || header.startsWith('proxy-')
    || header.startsWith('x-forwarded-')
    || header.startsWith('x-openapi-')
}

export function setPublicApiCors(
  event: H3Event,
  allowedMethods: readonly string[] = []
): PublicApiCorsResult {
  const requestedHeaders = requestedHeaderNames(event)
  const rejectedRequestHeaders = requestedHeaders.filter(isBlockedRequestHeader)
  const allowedRequestHeaders = Array.from(new Set([
    ...DEFAULT_ALLOWED_REQUEST_HEADERS,
    ...requestedHeaders.filter(header => !isBlockedRequestHeader(header))
  ]))

  setResponseHeaders(event, {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': allowedRequestHeaders.join(', '),
    'access-control-allow-methods': [...new Set([...allowedMethods, 'OPTIONS'])].join(', '),
    'access-control-expose-headers': EXPOSED_HEADERS,
    'access-control-max-age': 600
  })
  return { rejectedRequestHeaders }
}
