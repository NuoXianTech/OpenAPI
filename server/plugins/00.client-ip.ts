import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { isIP } from 'node:net'
import { ipInAnyCidr } from '#shared/utils/cidr'

const DEVELOPMENT_PROXY_CIDRS = ['127.0.0.1/32', '::1/128'] as const

function normalizeIp(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const normalized = trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed
  return isIP(normalized) !== 0 ? normalized : null
}

function readForwardedAddresses(event: H3Event): string[] {
  return (getHeader(event, 'x-forwarded-for') || '')
    .split(',')
    .map(normalizeIp)
    .filter((value): value is string => value !== null)
}

// 统一把直连地址或可信代理还原出的客户端地址写入 H3 context，
// 供限流、Turnstile 与审计日志中的 getRequestIP() 复用。
export default defineNitroPlugin((nitroApp) => {
  const runtimeConfig = useRuntimeConfig()
  const proxyConfig = runtimeConfig.proxy as { trustedCidrs?: unknown, forwardedHops?: unknown }
  const trustedCidrs = String(proxyConfig?.trustedCidrs ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  const forwardedHops = Math.min(Math.max(Number(proxyConfig?.forwardedHops) || 1, 1), 10)

  nitroApp.hooks.hook('request', (event: H3Event) => {
    const peerAddress = normalizeIp(event.context.clientAddress)
      || normalizeIp(event.node.req.socket?.remoteAddress)
    if (peerAddress) event.context.clientAddress = peerAddress

    const isTrustedConfiguredProxy = peerAddress !== null && ipInAnyCidr(peerAddress, trustedCidrs)
    const isDevelopmentProxy = import.meta.dev
      && (peerAddress === null || ipInAnyCidr(peerAddress, DEVELOPMENT_PROXY_CIDRS))
    if (!isTrustedConfiguredProxy && !isDevelopmentProxy) return

    const forwardedAddresses = readForwardedAddresses(event)
    const clientIndex = forwardedAddresses.length - forwardedHops
    const clientIp = clientIndex >= 0 ? forwardedAddresses[clientIndex] : undefined
    if (clientIp) event.context.clientAddress = clientIp
  })
})
