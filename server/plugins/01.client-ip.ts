import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { clientIpConfigService } from '~~/server/services/client-ip-config-service'
import { resolveClientIp } from '~~/server/utils/client-ip'
import { normalizeClientIp } from '~~/server/utils/request-meta'

// 在 00.startup.ts 的数据库初始化门之后注册请求钩子，确保数据库设置可安全读取。
export default defineNitroPlugin((nitroApp) => {
  const runtimeConfig = useRuntimeConfig()
  clientIpConfigService.configureEnvironment(runtimeConfig.proxy)

  nitroApp.hooks.hook('request', async (event: H3Event) => {
    // node-server preset 下 socket.remoteAddress 是最可靠的直连端；
    // 仅在平台未提供 socket 地址时回退到 Nitro context。
    const peerIp = normalizeClientIp(event.node.req.socket?.remoteAddress)
      || normalizeClientIp(event.context.clientAddress)
    const config = await clientIpConfigService.getEffectiveConfig()
    const resolution = resolveClientIp({
      peerIp,
      cfConnectingIp: getHeader(event, 'cf-connecting-ip'),
      xForwardedFor: getHeader(event, 'x-forwarded-for'),
      config
    })

    if (resolution.clientIp) event.context.clientAddress = resolution.clientIp
    else delete event.context.clientAddress
  })
})
