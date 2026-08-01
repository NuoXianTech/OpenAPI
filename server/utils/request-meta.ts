import type { H3Event } from 'h3'
import { getHeader, getRequestIP } from 'h3'
import { isIP } from 'node:net'

interface RequestMeta {
  ip: string | null
  userAgent: string | null
}

export function normalizeClientIp(value: string | null | undefined): string | null {
  let normalized = value?.trim()
  if (!normalized) return null

  const bracketed = normalized.match(/^\[([^\]]+)](?::\d+)?$/)
  if (bracketed?.[1]) normalized = bracketed[1]

  // Node 的 IPv6 socket 地址可能携带 zone id（例如 fe80::1%12）。
  // zone id 只用于本机路由选择，不属于可持久化或用于 CIDR 匹配的地址部分。
  const zoneIndex = normalized.indexOf('%')
  if (zoneIndex > 0 && normalized.includes(':')) {
    normalized = normalized.slice(0, zoneIndex)
  }

  // 某些代理会把 IPv4 与端口一起写入头部；IPv6 端口必须使用上面的方括号形式。
  if (normalized.split(':').length === 2) {
    const [host, port] = normalized.split(':')
    if (host && /^\d+$/.test(port || '') && isIP(host) === 4) normalized = host
  }

  normalized = normalized.toLowerCase().startsWith('::ffff:') ? normalized.slice(7) : normalized
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
