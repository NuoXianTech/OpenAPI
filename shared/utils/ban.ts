/**
 * 封禁状态判定（前后端共享，纯函数）。
 *
 * isBanned 仅表示"曾被封禁"，是否仍处于封禁需结合 bannedUntil 一起判断：
 *   - bannedUntil 为 null/undefined → 永久封禁
 *   - bannedUntil 为将来时间      → 仍在封禁中
 *   - bannedUntil 已过去          → 封禁已到期（视为未封禁，调用方应惰性清除标记）
 */

export interface BanState {
  isBanned: boolean
  bannedReason?: string | null
  bannedUntil?: Date | string | null
}

/** 是否仍处于有效封禁中（已到期返回 false）。 */
export function isBanActive(user: BanState, now: Date = new Date()): boolean {
  if (!user.isBanned) return false
  if (!user.bannedUntil) return true
  return new Date(user.bannedUntil).getTime() > now.getTime()
}

/** isBanned=true 但 bannedUntil 已过去 → 封禁已到期，可惰性解封。 */
export function isBanExpired(user: BanState, now: Date = new Date()): boolean {
  return user.isBanned === true && !isBanActive(user, now)
}

/** 面向被封禁用户的提示文案（含原因与解封时间）。 */
export function banMessage(user: BanState): string {
  const parts = ['账号已被封禁']
  const reason = user.bannedReason?.trim()
  if (reason) parts.push(`原因：${reason}`)
  if (user.bannedUntil) {
    const until = new Date(user.bannedUntil).toLocaleString('zh-CN', { hour12: false })
    parts.push(`解封时间：${until}`)
  } else {
    parts.push('（永久封禁）')
  }
  parts.push('如有疑问请联系管理员')
  return parts.join('，')
}
