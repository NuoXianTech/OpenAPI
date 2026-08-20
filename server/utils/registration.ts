import { createHash, timingSafeEqual } from 'node:crypto'
import type { SystemSettings } from '#shared/types/site-settings'

export type EmailFilterMode = 'off' | 'whitelist' | 'blacklist'
export type RegistrationMode = SystemSettings['registrationMode']

export function normalizeRegistrationMode(value: unknown): RegistrationMode {
  return value === 'invite' || value === 'closed' ? value : 'open'
}

export function registrationAllowsNewAccount(mode: RegistrationMode): boolean {
  return mode !== 'closed'
}

export function registrationRequiresInvite(mode: RegistrationMode): boolean {
  return mode === 'invite'
}

export function isRegistrationInviteValid(
  expected: string,
  submitted: string | null | undefined
): boolean {
  if (!expected || !submitted) return false
  const expectedHash = createHash('sha256').update(expected).digest()
  const submittedHash = createHash('sha256').update(submitted.trim()).digest()
  return timingSafeEqual(expectedHash, submittedHash)
}

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
