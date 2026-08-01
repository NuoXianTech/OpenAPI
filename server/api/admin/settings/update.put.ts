import { adminUpdateSiteSettingsSchema } from '~~/server/schemas/admin'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import type { SystemSettingsPatch } from '#shared/types/site-settings'
import { systemSettingsService, toAdminSystemSettings } from '~~/server/services/system-settings-service'
import { clientIpConfigService } from '~~/server/services/client-ip-config-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminUpdateSiteSettingsSchema)

  const updateInput: SystemSettingsPatch = body

  const data = await systemSettingsService.update(updateInput)
  clientIpConfigService.refreshFromSettings(data)

  const changedFields = Object.entries(updateInput)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)

  await operationLogService.addRequestLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.settings.update',
    resourceType: 'site-settings',
    resourceId: 'global',
    detail: { changedFields }
  })

  // 同时返回 public shape：前端用它原地刷新 useFetch('/api/settings/public') 缓存，避免再发一次 GET。
  return {
    ...toAdminSystemSettings(data),
    public: systemSettingsService.toPublicSettings(data)
  }
})
