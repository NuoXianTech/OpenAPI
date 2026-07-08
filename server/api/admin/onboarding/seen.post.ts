import type { H3Event } from 'h3'
import { ADMIN_PROFILE_ONBOARDING_SEEN_ACTION } from '#shared/config/admin-defaults'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)

  await operationLogService.addLog({
    userId: admin.id,
    actor: admin.username,
    action: ADMIN_PROFILE_ONBOARDING_SEEN_ACTION,
    resourceType: 'user',
    resourceId: admin.id,
    ...readRequestMeta(event)
  })

  return { ok: true }
})
