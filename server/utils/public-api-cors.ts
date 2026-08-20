import type { H3Event } from 'h3'
import { setResponseHeaders } from 'h3'

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

export function setPublicApiCors(event: H3Event, allowedMethods: readonly string[] = []): void {
  setResponseHeaders(event, {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-api-key, x-request-id',
    'access-control-allow-methods': [...new Set([...allowedMethods, 'OPTIONS'])].join(', '),
    'access-control-expose-headers': EXPOSED_HEADERS,
    'access-control-max-age': 600
  })
}
