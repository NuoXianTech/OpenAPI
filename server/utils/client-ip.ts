import type {
  ClientIpResolutionReason,
  EffectiveClientIpConfig
} from '#shared/types/client-ip'
import { ipInAnyCidr } from '#shared/utils/cidr'
import { normalizeClientIp } from './request-meta'

export interface ClientIpResolution {
  clientIp: string | null
  reason: ClientIpResolutionReason
}

export interface ResolveClientIpInput {
  peerIp: string | null
  cfConnectingIp?: string | null
  xForwardedFor?: string | null
  config: Pick<EffectiveClientIpConfig, 'source' | 'trustedProxyCidrs' | 'forwardedHops'>
}

function resolveFallback(
  peerIp: string | null,
  reason: ClientIpResolutionReason
): ClientIpResolution {
  return {
    clientIp: peerIp,
    reason
  }
}

function isTrustedPeer(peerIp: string | null, cidrs: readonly string[]): boolean {
  // ipInAnyCidr() 的通用白名单语义是“空列表 = 不限制”，代理信任不能复用该默认语义。
  return cidrs.length > 0 && peerIp !== null && ipInAnyCidr(peerIp, cidrs)
}

function parseForwardedAddresses(value: string): string[] | null {
  const entries = value.split(',').map(entry => entry.trim()).filter(Boolean)
  if (entries.length === 0) return []

  const addresses: string[] = []
  for (const entry of entries) {
    const address = normalizeClientIp(entry)
    // 拒绝整条格式异常的链，避免过滤异常项后改变 hop 下标。
    if (!address) return null
    addresses.push(address)
  }
  return addresses
}

export function resolveClientIp(input: ResolveClientIpInput): ClientIpResolution {
  const { config, peerIp } = input

  if (config.source === 'direct') {
    return resolveFallback(peerIp, peerIp ? 'direct' : 'peer_unavailable')
  }

  if (!peerIp) return resolveFallback(null, 'peer_unavailable')

  const trustedProxy = isTrustedPeer(peerIp, config.trustedProxyCidrs)
  if (!trustedProxy) return resolveFallback(peerIp, 'untrusted_proxy')

  if (config.source === 'cloudflare') {
    const rawHeader = input.cfConnectingIp?.trim()
    if (!rawHeader) return resolveFallback(peerIp, 'missing_header')

    const headerIp = normalizeClientIp(rawHeader)
    if (!headerIp) return resolveFallback(peerIp, 'invalid_header')
    return { clientIp: headerIp, reason: 'trusted_proxy' }
  }

  const rawHeader = input.xForwardedFor?.trim()
  if (!rawHeader) return resolveFallback(peerIp, 'missing_header')

  const addresses = parseForwardedAddresses(rawHeader)
  if (addresses === null) return resolveFallback(peerIp, 'invalid_header')

  const clientIndex = addresses.length - config.forwardedHops
  if (clientIndex < 0) {
    return resolveFallback(peerIp, 'insufficient_forwarded_hops')
  }

  const headerIp = addresses[clientIndex] ?? null
  if (!headerIp) return resolveFallback(peerIp, 'invalid_header')
  return { clientIp: headerIp, reason: 'trusted_proxy' }
}
