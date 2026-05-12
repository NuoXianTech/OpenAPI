import type { H3Event } from 'h3'
import { adminUpdateSiteSettingsSchema } from '#shared/schemas/admin'
import { requireAdmin } from '~~/server/utils/auth'
import { siteSettingsService, type SiteSettingsUpsertInput } from '~~/server/service/siteSettingsService'
import { operationLogService } from '~~/server/service/operationLogService'
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

  return data
})
