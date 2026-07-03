import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'

export interface RequestMeta {
  ip: string | null
  userAgent: string | null
}

export function readRequestMeta(event: H3Event, fallbackIp: string | null = null): RequestMeta {
  return {
    ip: getRequestIP(event) || fallbackIp,
    userAgent: getHeader(event, 'user-agent') || null
  }
}
