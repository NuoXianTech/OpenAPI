import {
  needsInitialAdminOnboarding,
  type AdminProfileIdentity
} from '#shared/config/admin-defaults'
import { createApplicationError } from '~~/server/errors/application-error'

const ADMIN_ONBOARDING_PATHS = new Set([
  '/api/admin/onboarding/status',
  '/api/admin/onboarding/profile'
])

interface OnboardingAdmin extends AdminProfileIdentity {
  tokenVersion?: number | null
}

/**
 * 在出厂管理员轮换掉出厂口令之前，挡住其余全部管理端点。
 *
 * 判据见 needsInitialAdminOnboarding：必须同时「仍是出厂身份」且「口令未轮换」。
 * 只判其中一个都会出问题——只判口令会拦住新建的管理员，只判身份会永久弹出引导。
 */
export function assertAdminOnboardingCompleted(
  admin: OnboardingAdmin,
  pathname: string
): void {
  if (!needsInitialAdminOnboarding(admin)) return
  if (ADMIN_ONBOARDING_PATHS.has(pathname)) return

  throw createApplicationError({
    statusCode: 428,
    message: '请先修改初始管理员密码',
    data: { code: 'ADMIN_ONBOARDING_REQUIRED' }
  })
}
