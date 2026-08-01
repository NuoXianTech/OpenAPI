import { getIpAddressFamily, isCidr } from './cidr'

export interface TrustedProxyCidrParseResult {
  cidrs: string[]
  invalidEntries: string[]
  normalized: string
  trustsAllIpv4: boolean
  trustsAllIpv6: boolean
}

function splitEntries(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map(value => value.trim())
    .filter(Boolean)
}

function normalizeEntry(input: string): string | null {
  const value = input.trim().toLowerCase()
  if (!value) return null
  if (isCidr(value)) return value

  // 0.0.0.0 与 :: 是未指定地址，不应被误解为“全部地址”。
  // 全部 IPv4 / IPv6 必须明确写成 0.0.0.0/0 与 ::/0。
  if (value === '0.0.0.0' || value === '::') return null

  const family = getIpAddressFamily(value)
  if (family === 4) return `${value}/32`
  if (family === 6) return `${value}/128`
  return null
}

export function parseTrustedProxyCidrs(input: string): TrustedProxyCidrParseResult {
  const cidrs: string[] = []
  const invalidEntries: string[] = []
  const seen = new Set<string>()
  let trustsAllIpv4 = false
  let trustsAllIpv6 = false

  for (const entry of splitEntries(input)) {
    const normalized = normalizeEntry(entry)
    if (!normalized) {
      invalidEntries.push(entry)
      continue
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    cidrs.push(normalized)

    if (normalized.endsWith('/0')) {
      const family = getIpAddressFamily(normalized.slice(0, -2))
      if (family === 4) trustsAllIpv4 = true
      if (family === 6) trustsAllIpv6 = true
    }
  }

  return {
    cidrs,
    invalidEntries,
    normalized: cidrs.join('\n'),
    trustsAllIpv4,
    trustsAllIpv6
  }
}
