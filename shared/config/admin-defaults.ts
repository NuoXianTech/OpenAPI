export const INITIAL_ADMIN_PROFILE = {
  username: 'admin',
  email: 'admin@openapi.com',
  displayName: 'admin'
} as const

export const ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX = 'admin.profile.onboarding'
export const ADMIN_PROFILE_ONBOARDING_SEEN_ACTION = `${ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX}.seen`
export const ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION = `${ADMIN_PROFILE_ONBOARDING_ACTION_PREFIX}.update`

export interface AdminProfileIdentity {
  username?: string | null
  email?: string | null
}

export function needsInitialAdminProfileSetup(profile: AdminProfileIdentity): boolean {
  return normalizeIdentity(profile.username) === INITIAL_ADMIN_PROFILE.username
    || normalizeIdentity(profile.email) === INITIAL_ADMIN_PROFILE.email
}

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}
