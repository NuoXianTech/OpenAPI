import type { H3Event } from 'h3'
import { ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX, needsInitialAdminProfileSetup } from '#shared/config/admin-defaults'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)

  if (!needsInitialAdminProfileSetup(admin)) {
    return { shouldShow: false }
  }

  const logs = await operationLogService.list({
    userId: admin.id,
    action: ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX,
    limit: 1
  })

  return { shouldShow: logs.total === 0 }
})
