import type { H3Event } from 'h3'
import { getHeader } from 'h3'

// 反代后还原真实客户端 IP（供限流 / Turnstile / 审计日志使用）。
// 单层 nginx 用 $proxy_add_x_forwarded_for 把直连 IP 追加到 X-Forwarded-For 末尾，
// 客户端伪造的值只会落在左侧，所以取「最后一项」即真实客户端、且无法被伪造。
// 写入 event.context.clientAddress 后，全站 getRequestIP() 会短路返回它（见 h3 源码），
// 无需改动任何调用点。注：此处假设恰好一层可信反代；若再叠 Cloudflare 等需另议。
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event: H3Event) => {
    const clientIp = getHeader(event, 'x-forwarded-for')?.split(',').pop()?.trim()
    if (clientIp) {
      event.context.clientAddress = clientIp
    }
  })
})
