import { setResponseHeader } from 'h3'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { systemSettingsService } from '~~/server/services/system-settings-service'

export default defineAdminEventHandler((event) => {
  // 管理端只返回敏感配置的“是否已配置”状态，仍禁止任何中间缓存留存响应。
  setResponseHeader(event, 'Cache-Control', 'private, no-store')

  return systemSettingsService.getForAdmin()
})
