const LOCAL_ORIGIN = 'https://console.invalid'

function hasUnsafePathCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (character === '\\' || code <= 0x1F || code === 0x7F) return true
  }
  return false
}

export function normalizeLocalReturnTo(value: string | null | undefined): string {
  const raw = value?.trim() || '/'
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return '/'
  }
  if (hasUnsafePathCharacters(raw) || hasUnsafePathCharacters(decoded)) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'

  try {
    const url = new URL(raw, LOCAL_ORIGIN)
    if (url.origin !== LOCAL_ORIGIN) return '/'
    return `${url.pathname}${url.search}${url.hash}` || '/'
  } catch {
    return '/'
  }
}
