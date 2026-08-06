export interface SafePublicUrlOptions {
  allowRelative?: boolean
}

const RELATIVE_URL_BASE = 'https://relative.invalid'

export function isSafePublicUrl(
  value: string | null | undefined,
  options: SafePublicUrlOptions = {}
): boolean {
  const raw = value?.trim()
  if (!raw) return false

  if (options.allowRelative && raw.startsWith('/') && !raw.startsWith('//')) {
    try {
      return new URL(raw, RELATIVE_URL_BASE).origin === RELATIVE_URL_BASE
    } catch {
      return false
    }
  }

  try {
    const url = new URL(raw)
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && !url.username
      && !url.password
  } catch {
    return false
  }
}

export function isSafeSiteOrigin(value: string | null | undefined): boolean {
  const raw = value?.trim()
  if (!isSafePublicUrl(raw)) return false

  try {
    const url = new URL(raw!)
    return (url.pathname === '' || url.pathname === '/')
      && !url.search
      && !url.hash
  } catch {
    return false
  }
}
