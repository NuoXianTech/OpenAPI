export const SUPPORTED_OAUTH_PROVIDERS = ['github', 'qq'] as const
export type SupportedOauthProvider = typeof SUPPORTED_OAUTH_PROVIDERS[number]

export interface PendingOauthView {
  pending: boolean
  provider?: SupportedOauthProvider
  displayName?: string
  icon?: string
  nickname?: string | null
  avatarUrl?: string | null
  email?: string | null
  suggestedUsername?: string
  emailHasAccount?: boolean
  allowRegister?: boolean
  requiresInviteCode?: boolean
}
