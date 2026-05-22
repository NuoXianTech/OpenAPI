/**
 * CIDR 校验与匹配 · 纯 TS 实现（无 node:net 依赖，shared/ 同时供前后端使用）。
 *
 * 仅接受 CIDR 格式（含掩码）：单 IP 必须写成 /32（IPv4）或 /128（IPv6）。
 * 同时支持 IPv4 与 IPv6 范围匹配，用于 apiKeys.ipWhitelist 校验。
 *
 * 实现要点：
 *   - 解析后把 IP 转成 bigint，掩码区段相等即视为命中
 *   - 请求侧若拿到的是 IPv4-mapped IPv6（::ffff:1.2.3.4）会回退用其 IPv4 部分匹配 IPv4 CIDR
 */

const IPV4_LITERAL_RE = /^\d{1,3}(\.\d{1,3}){3}$/

export type CidrParseResult
  = | { ok: true, family: 4 | 6, network: bigint, prefix: number, total: number }
    | { ok: false, reason: string }

function isValidIPv4(input: string): boolean {
  if (!IPV4_LITERAL_RE.test(input)) return false
  return input.split('.').every((p) => {
    if (!/^\d+$/.test(p)) return false
    // 禁止 "01" 这类前导 0；单独的 "0" 允许
    if (p.length > 1 && p.startsWith('0')) return false
    const n = Number(p)
    return n >= 0 && n <= 255
  })
}

function ipv4ToBigint(ip: string): bigint | null {
  if (!isValidIPv4(ip)) return null
  let result = 0n
  for (const part of ip.split('.')) {
    result = (result << 8n) | BigInt(Number(part))
  }
  return result
}

/**
 * 解析 IPv6 为 8 个 16-bit 段。失败返回 null。
 * 支持 :: 缩写、IPv4-mapped 形式（::ffff:1.2.3.4）。
 */
function parseIPv6Groups(input: string): string[] | null {
  if (input.length === 0) return null
  let s = input.toLowerCase()

  // IPv4-mapped 尾部：把 a.b.c.d 转成 hi:lo 两个 hex group
  const lastColon = s.lastIndexOf(':')
  if (lastColon !== -1) {
    const tail = s.slice(lastColon + 1)
    if (IPV4_LITERAL_RE.test(tail)) {
      if (!isValidIPv4(tail)) return null
      const parts = tail.split('.').map(Number)
      const hi = (((parts[0]! << 8) | parts[1]!) >>> 0).toString(16)
      const lo = (((parts[2]! << 8) | parts[3]!) >>> 0).toString(16)
      s = `${s.slice(0, lastColon + 1)}${hi}:${lo}`
    }
  }

  // 仅允许 hex 数字与冒号
  if (!/^[0-9a-f:]+$/.test(s)) return null

  // 最多一个 "::"
  const dciFirst = s.indexOf('::')
  const dciLast = s.lastIndexOf('::')
  if (dciFirst !== dciLast) return null

  let groups: string[]
  if (dciFirst === -1) {
    groups = s.split(':')
  } else {
    const leftPart = s.slice(0, dciFirst)
    const rightPart = s.slice(dciFirst + 2)
    const left = leftPart === '' ? [] : leftPart.split(':')
    const right = rightPart === '' ? [] : rightPart.split(':')
    const missing = 8 - left.length - right.length
    if (missing < 0) return null
    groups = [...left, ...Array(missing).fill('0'), ...right]
  }

  if (groups.length !== 8) return null
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null
  }
  return groups
}

function isValidIPv6(input: string): boolean {
  return parseIPv6Groups(input) !== null
}

function ipv6ToBigint(ip: string): bigint | null {
  const groups = parseIPv6Groups(ip)
  if (!groups) return null
  let result = 0n
  for (const g of groups) {
    result = (result << 16n) | BigInt(parseInt(g, 16))
  }
  return result
}

function applyMask(addr: bigint, prefix: number, total: number): bigint {
  if (prefix === total) return addr
  if (prefix === 0) return 0n
  const hostBits = total - prefix
  const fullMask = (1n << BigInt(total)) - 1n
  const mask = (~((1n << BigInt(hostBits)) - 1n)) & fullMask
  return addr & mask
}

/** 解析单条 CIDR；失败时返回带原因的错误对象 */
export function parseCidr(input: string): CidrParseResult {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, reason: '不能为空' }

  const slashIdx = trimmed.indexOf('/')
  if (slashIdx === -1) {
    return { ok: false, reason: '必须使用 CIDR 格式（例：10.0.0.0/8 或 192.168.1.1/32）' }
  }

  const ipPart = trimmed.slice(0, slashIdx)
  const prefixPart = trimmed.slice(slashIdx + 1)
  if (!/^\d+$/.test(prefixPart)) {
    return { ok: false, reason: '掩码必须为非负整数' }
  }
  const prefix = Number(prefixPart)

  if (isValidIPv4(ipPart)) {
    if (prefix > 32) return { ok: false, reason: 'IPv4 掩码不能超过 32' }
    const addr = ipv4ToBigint(ipPart)
    if (addr === null) return { ok: false, reason: '无效的 IPv4 地址' }
    return { ok: true, family: 4, network: applyMask(addr, prefix, 32), prefix, total: 32 }
  }
  if (isValidIPv6(ipPart)) {
    if (prefix > 128) return { ok: false, reason: 'IPv6 掩码不能超过 128' }
    const addr = ipv6ToBigint(ipPart)
    if (addr === null) return { ok: false, reason: '无效的 IPv6 地址' }
    return { ok: true, family: 6, network: applyMask(addr, prefix, 128), prefix, total: 128 }
  }
  return { ok: false, reason: '无效的 IP 地址' }
}

/** 单条 CIDR 是否合法 */
export function isCidr(input: string): boolean {
  return parseCidr(input).ok
}

/** 检查 IP 是否落在指定 CIDR 范围内 */
export function ipInCidr(ip: string, cidr: string): boolean {
  const parsed = parseCidr(cidr)
  if (!parsed.ok) return false

  let addr: bigint | null = null
  let family: 4 | 6 | null = null

  if (isValidIPv4(ip)) {
    addr = ipv4ToBigint(ip)
    family = 4
  } else if (isValidIPv6(ip)) {
    // IPv4-mapped IPv6 也允许匹配 IPv4 CIDR
    if (parsed.family === 4) {
      const lastColon = ip.lastIndexOf(':')
      const tail = ip.slice(lastColon + 1)
      if (IPV4_LITERAL_RE.test(tail) && isValidIPv4(tail)) {
        addr = ipv4ToBigint(tail)
        family = 4
      }
    }
    if (addr === null) {
      addr = ipv6ToBigint(ip)
      family = 6
    }
  }

  if (addr === null || family !== parsed.family) return false
  return applyMask(addr, parsed.prefix, parsed.total) === parsed.network
}

/** 白名单空 = 不限；非空 = IP 必须命中其中至少一条 CIDR */
export function ipInAnyCidr(ip: string | null, whitelist: string[] | null | undefined): boolean {
  if (!whitelist || whitelist.length === 0) return true
  if (!ip) return false
  for (const cidr of whitelist) {
    if (ipInCidr(ip, cidr)) return true
  }
  return false
}
