export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (text) return text
    }
  }
  return ''
}

export function toMediaUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (!text) return ''

  try {
    const url = new URL(text.startsWith('//') ? `https:${text}` : text)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function firstMediaUrl(...values: unknown[]): string {
  for (const value of values) {
    const directUrl = toMediaUrl(value)
    if (directUrl) return directUrl
    if (!isRecord(value)) continue

    const nestedUrl = firstMediaUrl(
      value.url,
      value.src,
      value.masterUrl,
      value.master_url,
      value.playUrl,
      value.play_url,
      value.uri
    )
    if (nestedUrl) return nestedUrl
  }
  return ''
}

export function collectMediaUrls(...values: unknown[]): string[] {
  const urls: string[] = []

  for (const value of values) {
    if (Array.isArray(value)) {
      urls.push(...collectMediaUrls(...value))
      continue
    }

    if (isRecord(value)) {
      const nestedList = value.url_list ?? value.urlList
      if (Array.isArray(nestedList)) urls.push(...collectMediaUrls(...nestedList))
    }

    const url = firstMediaUrl(value)
    if (url) urls.push(url)
  }

  return [...new Set(urls)]
}

export function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function decodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'))
  } catch {
    return value
  }
}
