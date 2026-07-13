import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { isMaoyanEncoding, type MaoyanEncoding } from '~~/server/lib/maoyan'
import { readQueryString } from '~~/server/utils/request-query'
import { ensureRequestId } from '~~/server/utils/request-id'

export function readMaoyanEncoding(event: H3Event): MaoyanEncoding {
  const query = getQuery(event) as Record<string, unknown>
  const value = readQueryString(query.encode || query.encoding).trim().toLowerCase()
  return isMaoyanEncoding(value) ? value : 'json'
}

export function setMaoyanTextHeaders(event: H3Event, contentType: 'text/plain' | 'text/markdown', maxAge: number): void {
  setResponseHeader(event, 'content-type', `${contentType}; charset=utf-8`)
  setResponseHeader(event, 'cache-control', `public, max-age=${maxAge}`)
  setResponseHeader(event, 'x-request-id', ensureRequestId(event))
}
