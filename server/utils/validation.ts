export type EmailFilterMode = 'off' | 'whitelist' | 'blacklist'

export function normalizeEmailFilterMode(value: unknown): EmailFilterMode {
  return value === 'whitelist' || value === 'blacklist' ? value : 'off'
}

/**
 * 解析邮箱域名列表。支持逗号或换行混用分隔，例如：
 *   163.com, qq.com
 *   gmail.com
 * 自动小写、trim、去 @ 前缀（兼容 @example.com 写法）；# 开头的行视为注释。
 */
export function parseEmailDomainList(raw: string | null | undefined): string[] {
  if (!raw) {
    return []
  }
  return raw
    .split(/[,\n\r]+/)
    .map(item => item.trim().toLowerCase().replace(/^@/, ''))
    .filter(item => item.length > 0 && !item.startsWith('#'))
}

/**
 * 按 mode + domains 决定邮箱是否允许注册。
 *   - off：始终允许
 *   - whitelist：邮箱域名命中列表才允许（列表为空时一律拒绝，避免误开白名单又留空把所有人放走）
 *   - blacklist：邮箱域名命中列表则拒绝
 */
export function isEmailAllowedForRegistration(email: string, mode: EmailFilterMode, domains: string[]): boolean {
  if (mode === 'off') {
    return true
  }
  const normalized = email.trim().toLowerCase()
  const atIdx = normalized.lastIndexOf('@')
  if (atIdx <= 0 || atIdx === normalized.length - 1) {
    return false
  }
  const domain = normalized.slice(atIdx + 1)
  const matched = domains.includes(domain)
  return mode === 'whitelist' ? matched : !matched
}
