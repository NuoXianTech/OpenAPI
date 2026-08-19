import { createHash } from 'node:crypto'
import { isSupportedLocale } from '#shared/config/locale-defaults'
import type { AuthUser, UserProfile } from '#shared/types/auth'
import type { users } from '~~/server/db/schema'
import { toIsoString, toNullableIsoString } from '~~/server/utils/date'

type UserRecord = typeof users.$inferSelect

export function userAvatarUrl(email: string): string {
  const normalized = email.trim().toLowerCase()
  const hash = createHash('md5').update(normalized).digest('hex')
  return `https://cravatar.cn/avatar/${hash}`
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: userAvatarUrl(user.email),
    role: user.role as AuthUser['role'],
    locale: isSupportedLocale(user.locale) ? user.locale : null
  }
}

export function toUserProfile(user: UserRecord): UserProfile {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: userAvatarUrl(user.email),
    displayName: user.displayName,
    locale: isSupportedLocale(user.locale) ? user.locale : null,
    emailVerifiedAt: toNullableIsoString(user.emailVerifiedAt),
    createdAt: toIsoString(user.createdAt)
  }
}
