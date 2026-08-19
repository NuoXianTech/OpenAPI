import type { SupportedLocale } from '../config/locale-defaults'

export interface RegisterInput {
  username: string
  email: string
  password: string
  inviteCode?: string
  turnstileToken?: string
}

export interface OauthRegisterInput {
  email: string
  username?: string
  password: string
  inviteCode?: string
  turnstileToken?: string
}

export interface AuthUser {
  id: number
  username: string
  displayName: string | null
  email: string
  avatarUrl: string
  role: 'user' | 'admin'
  locale: SupportedLocale | null
}

export interface UserProfile {
  id: number
  username: string
  email: string
  avatarUrl: string
  displayName: string | null
  locale: SupportedLocale | null
  emailVerifiedAt: string | null
  createdAt: string
}

export interface LoginInput {
  email?: string
  username?: string
  password: string
  remember?: boolean
  turnstileToken?: string
}

export interface RequestPasswordResetInput {
  email: string
  turnstileToken?: string
}

export interface ResetPasswordInput {
  userId: number
  token: string
  newPassword: string
}

export interface ConfirmEmailChangeInput {
  userId: number
  token: string
}

export interface VerifyEmailInput {
  userId: number
  token: string
}
