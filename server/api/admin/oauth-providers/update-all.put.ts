import type { H3Event } from 'h3'
import { adminUpdateOauthProvidersSchema } from '~~/server/schemas/admin'
import {
  oauthProviderService,
  toAdminOauthProviderSafe
} from '~~/server/services/oauth-provider-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readZodBody(event, adminUpdateOauthProvidersSchema)
  const providers = await oauthProviderService.updateAll(body)

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.oauth-provider.update-all',
    resourceType: 'oauth-provider',
    resourceId: 'all',
    ...readRequestMeta(event),
    detail: {
      changedFields: ['oauthForceBinding', ...providers.map(item => item.provider)]
    }
  })

  return {
    oauthForceBinding: body.oauthForceBinding,
    providers: providers.map(toAdminOauthProviderSafe)
  }
})
