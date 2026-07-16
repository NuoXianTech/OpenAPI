import { ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX, needsInitialAdminProfileSetup } from '#shared/config/admin-defaults'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event, admin) => {
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
