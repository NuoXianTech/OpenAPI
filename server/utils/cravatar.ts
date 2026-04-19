import { createHash } from 'node:crypto'

export function getCravatarUrl(email: string | null | undefined): string {
  const normalized = (email ?? '').trim().toLowerCase()
  const hash = createHash('md5').update(normalized).digest('hex')
  return `https://cravatar.cn/avatar/${hash}`
}
