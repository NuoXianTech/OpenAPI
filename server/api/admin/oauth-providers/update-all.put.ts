import { adminUpdateOauthProvidersSchema } from '~~/server/schemas/admin'
import {
  oauthProviderService,
  toAdminOauthProviderSafe
} from '~~/server/services/oauth-provider-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { siteSettingsService } from '~~/server/services/site-settings-service'
import { createOauthSettingsAuditDetail } from '~~/server/utils/oauth-audit'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminUpdateOauthProvidersSchema)
  const currentSettings = await siteSettingsService.getOrCreate()
  const beforeProviders = await oauthProviderService.list()
  const providers = await oauthProviderService.updateAll(body)
  const detail = createOauthSettingsAuditDetail(
    currentSettings.oauthForceBinding,
    beforeProviders,
    body.oauthForceBinding,
    providers
  )

  if (detail) {
    await operationLogService.addRequestLog(event, {
      userId: admin.id,
      actor: admin.username,
      action: 'admin.oauth-settings.update',
      resourceType: 'oauth-settings',
      resourceId: 'global',
      detail
    })
  }

  return {
    oauthForceBinding: body.oauthForceBinding,
    providers: providers.map(toAdminOauthProviderSafe)
  }
})
