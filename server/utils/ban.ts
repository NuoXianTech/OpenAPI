export interface BanState {
  isBanned: boolean
  bannedReason?: string | null
  bannedUntil?: Date | string | null
}

export function isBanActive(user: BanState, now: Date = new Date()): boolean {
  if (!user.isBanned) return false
  if (!user.bannedUntil) return true
  return new Date(user.bannedUntil).getTime() > now.getTime()
}

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
