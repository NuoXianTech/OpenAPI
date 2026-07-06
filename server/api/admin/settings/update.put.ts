import type { H3Event } from 'h3'
import { adminUpdateSiteSettingsSchema } from '~~/server/schemas/admin'
import { requireAdmin } from '~~/server/utils/auth'
import { siteSettingsService, toAdminSiteSettings, type SiteSettingsUpsertInput } from '~~/server/services/site-settings-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminUpdateSiteSettingsSchema)

  const updateInput: SiteSettingsUpsertInput = body

  const data = await siteSettingsService.update(updateInput)

  const changedFields = Object.entries(updateInput)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.settings.update',
    resourceType: 'site-settings',
    resourceId: String(data.id),
    detail: { changedFields }
  })

  // 同时返回 public shape：前端用它原地刷新 useFetch('/api/settings/public') 缓存，避免再发一次 GET。
  return {
    ...toAdminSiteSettings(data),
    public: siteSettingsService.toPublicSettings(data)
  }
})
