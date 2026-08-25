import { needsInitialAdminOnboarding } from '#shared/config/admin-defaults'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler((_event, admin) => {
  // 判据与 assertAdminOnboardingCompleted 完全一致，避免弹窗与闸门产生分歧。
  return { shouldShow: needsInitialAdminOnboarding(admin) }
})
