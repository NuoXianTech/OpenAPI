import { userService } from '~~/server/services/user-service'

export type EmailFilterMode = 'off' | 'whitelist' | 'blacklist'

export function normalizeEmailFilterMode(value: unknown): EmailFilterMode {
  return value === 'whitelist' || value === 'blacklist' ? value : 'off'
}

export function parseEmailDomainList(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[,\n\r]+/)
    .map(item => item.trim().toLowerCase().replace(/^@/, ''))
    .filter(item => item.length > 0 && !item.startsWith('#'))
}

export function isEmailAllowedForRegistration(
  email: string,
  mode: EmailFilterMode,
  domains: string[]
): boolean {
  if (mode === 'off') return true
  const normalized = email.trim().toLowerCase()
  const atIndex = normalized.lastIndexOf('@')
  if (atIndex <= 0 || atIndex === normalized.length - 1) return false
  const matched = domains.includes(normalized.slice(atIndex + 1))
  return mode === 'whitelist' ? matched : !matched
}

interface RollbackCreatedUserOptions {
  userId: number
  reason: string
  error: unknown
}

export async function rollbackCreatedUser(options: RollbackCreatedUserOptions): Promise<void> {
  const { userId, reason, error } = options
  console.error(`[registration] ${reason}, rolling back user`, { userId, error })
  try {
    await userService.deletePendingUser(userId)
  } catch (rollbackError) {
    console.error('[registration] rollback failed', { userId, error: rollbackError })
  }
}
