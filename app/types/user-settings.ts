import type { SupportedLocale } from '#shared/config/locale-defaults'

export interface UserProfileData {
  id: number
  username: string
  email: string
  avatarUrl: string
  displayName: string | null
  locale: SupportedLocale | null
  emailVerifiedAt: string | null
  createdAt: string
}

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
