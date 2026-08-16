const QQ_AVATAR_HOST = 'q1.qlogo.cn'
const QQ_NUMBER_PATTERN = /^[1-9][0-9]{4,11}$/
const QQ_AVATAR_SIZES = [40, 100, 140, 640] as const

export type QqAvatarSize = typeof QQ_AVATAR_SIZES[number]
export type QqAvatarOutputType = 'json' | 'image'

export interface QqAvatarData {
  qq: string
  size: QqAvatarSize
  url: string
}

export function normalizeQqNumber(value: string): string | null {
  const qq = value.trim()
  return QQ_NUMBER_PATTERN.test(qq) ? qq : null
}

export function parseQqAvatarSize(value: string): QqAvatarSize | null {
  const normalized = value.trim()
  if (!normalized) return 100
  const size = QQ_AVATAR_SIZES.find(candidate => String(candidate) === normalized)
  return size ?? null
}

export function parseQqAvatarOutputType(value: string): QqAvatarOutputType | null {
  const type = value.trim().toLowerCase()
  if (!type || type === 'json') return 'json'
  if (type === 'image') return 'image'
  return null
}

export function createQqAvatarData(qq: string, size: QqAvatarSize): QqAvatarData {
  const url = new URL(`https://${QQ_AVATAR_HOST}/g`)
  url.searchParams.set('b', 'qq')
  url.searchParams.set('nk', qq)
  url.searchParams.set('s', String(size))
  return { qq, size, url: url.toString() }
}
