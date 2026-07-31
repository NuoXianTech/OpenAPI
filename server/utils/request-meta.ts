import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'
import { isIP } from 'node:net'

interface RequestMeta {
  ip: string | null
  userAgent: string | null
}

export function normalizeClientIp(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const normalized = trimmed.toLowerCase().startsWith('::ffff:') ? trimmed.slice(7) : trimmed
  if (normalized === '0.0.0.0' || normalized === '::') return null

  return isIP(normalized) !== 0 ? normalized : null
}

export function readClientIp(event: H3Event): string | null {
  return normalizeClientIp(getRequestIP(event))
}

export function toClientIpRateLimitValue(ip: string | null): string {
  return ip ?? 'unknown'
}

export function readRequestMeta(event: H3Event): RequestMeta {
  return {
    ip: readClientIp(event),
    userAgent: getHeader(event, 'user-agent') || null
  }
}
