import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { siteSettingsService } from '~~/server/services/site-settings-service'

export default defineAdminEventHandler((event: H3Event) => {
  // 返回明文 SMTP 密码与 Turnstile secret，禁止任何 CDN / 反向代理 / 浏览器磁盘缓存留存该响应。
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  return siteSettingsService.getForAdmin()
})
