export type { UserProfile as UserProfileData } from '#shared/types/auth'

export interface UserOauthBinding {
  provider: string
  displayName: string
  icon: string
  enabled: boolean
  bound: boolean
  nickname: string | null
  email: string | null
  avatarUrl: string | null
  providerUserId: string | null
  linkedAt: string | null
}
