import {
  ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX,
  needsInitialAdminProfileSetup,
  type AdminProfileIdentity
} from '#shared/config/admin-defaults'
import { createApplicationError } from '~~/server/errors/application-error'
import { operationLogService } from '~~/server/services/operation-log-service'

const ADMIN_ONBOARDING_PATHS = new Set([
  '/api/admin/onboarding/status',
  '/api/admin/onboarding/profile'
])

export async function assertAdminOnboardingCompleted(
  admin: AdminProfileIdentity & { id: number },
  pathname: string
): Promise<void> {
  if (!needsInitialAdminProfileSetup(admin)) return
  if (ADMIN_ONBOARDING_PATHS.has(pathname)) return

  const logs = await operationLogService.list({
    userId: admin.id,
    action: ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX,
    limit: 1
  })
  if (logs.total > 0) return

  throw createApplicationError({
    statusCode: 428,
    message: '请先完成初始管理员资料与密码设置',
    data: { code: 'ADMIN_ONBOARDING_REQUIRED' }
  })
}
