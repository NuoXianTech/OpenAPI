import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { isIP } from 'node:net'
import { ipInAnyCidr } from '#shared/utils/cidr'

// 反代后还原真实客户端 IP（供限流 / Turnstile / 审计日志使用）。
// 单层 nginx 用 $proxy_add_x_forwarded_for 把直连 IP 追加到 X-Forwarded-For 末尾，
// 客户端伪造的值只会落在左侧，所以取「最后一项」即真实客户端、且无法被伪造。
// 写入 event.context.clientAddress 后，全站 getRequestIP() 会短路返回它（见 h3 源码），
// 无需改动任何调用点。注：此处假设恰好一层可信反代；若再叠 Cloudflare 等需另议。
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event: H3Event) => {
    const runtimeConfig = useRuntimeConfig()
    const proxyConfig = runtimeConfig.proxy as { trustedCidrs?: unknown, forwardedHops?: unknown }
    const trustedCidrs = String(proxyConfig?.trustedCidrs ?? '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
    if (trustedCidrs.length === 0) return

    const remoteAddress = event.node.req.socket.remoteAddress || null
    if (!ipInAnyCidr(remoteAddress, trustedCidrs)) return

    const forwardedHops = Math.min(Math.max(Number(proxyConfig?.forwardedHops) || 1, 1), 10)
    const forwardedAddresses = (getHeader(event, 'x-forwarded-for') || '')
      .split(',')
      .map(value => value.trim())
      .filter(value => isIP(value) !== 0)
    const clientIndex = forwardedAddresses.length - forwardedHops
    const clientIp = clientIndex >= 0 ? forwardedAddresses[clientIndex] : undefined
    if (clientIp) event.context.clientAddress = clientIp
  })
})
