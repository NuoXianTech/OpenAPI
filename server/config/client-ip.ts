import type { ClientIpSource, EffectiveClientIpConfig } from '#shared/types/client-ip'
import { parseTrustedProxyCidrs } from '#shared/utils/proxy-cidrs'

export interface RuntimeProxyConfigInput {
  source?: unknown
  trustedCidrs?: unknown
  forwardedHops?: unknown
}

function normalizeSource(value: unknown): ClientIpSource | null {
  const source = String(value ?? '').trim().toLowerCase()
  if (!source) return null
  if (source === 'direct') return 'direct'
  if (source === 'cloudflare' || source === 'cf') return 'cloudflare'
  if (source === 'x_forwarded_for' || source === 'x-forwarded-for' || source === 'xff') {
    return 'x_forwarded_for'
  }
  throw new Error('NUXT_PROXY_SOURCE must be direct / cloudflare / x_forwarded_for')
}

function readTrustedCidrs(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join('\n')
  return String(value ?? '')
}

function readForwardedHops(value: unknown): number {
  const hops = Number(value ?? 1)
  if (!Number.isInteger(hops) || hops < 1 || hops > 10) {
    throw new Error('NUXT_PROXY_FORWARDED_HOPS must be an integer between 1 and 10')
  }
  return hops
}

/**
 * 环境变量只在显式配置 source，或旧版 trustedCidrs 非空时接管后台设置。
 * 后者保持 NUXT_PROXY_TRUSTED_CIDRS 旧部署的 XFF 行为兼容。
 */
export function parseRuntimeClientIpConfig(
  input: RuntimeProxyConfigInput
): EffectiveClientIpConfig | null {
  const trustedInput = readTrustedCidrs(input.trustedCidrs)
  const explicitSource = normalizeSource(input.source)
  const source = explicitSource ?? (trustedInput.trim() ? 'x_forwarded_for' : null)
  if (!source) return null

  if (source === 'direct') {
    return {
      source,
      trustedProxyCidrs: [],
      forwardedHops: 1,
      managedBy: 'environment',
      safeFallback: false
    }
  }

  const parsed = parseTrustedProxyCidrs(trustedInput)
  if (parsed.invalidEntries.length > 0) {
    throw new Error(
      `NUXT_PROXY_TRUSTED_CIDRS contains invalid IP/CIDR entries: ${parsed.invalidEntries.slice(0, 5).join(', ')}`
    )
  }
  if (parsed.cidrs.length === 0) {
    throw new Error(`NUXT_PROXY_TRUSTED_CIDRS is required when NUXT_PROXY_SOURCE=${source}`)
  }
  if (parsed.cidrs.length > 256) {
    throw new Error('NUXT_PROXY_TRUSTED_CIDRS supports at most 256 entries')
  }

  return {
    source,
    trustedProxyCidrs: parsed.cidrs,
    forwardedHops: source === 'x_forwarded_for' ? readForwardedHops(input.forwardedHops) : 1,
    managedBy: 'environment',
    safeFallback: false
  }
}
