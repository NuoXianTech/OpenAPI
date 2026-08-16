export function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? firstQueryValue(value[0]) : value
}

export function readQueryString(value: unknown, fallback = ''): string {
  const normalized = firstQueryValue(value)
  return normalized === null || normalized === undefined ? fallback : String(normalized)
}

export function readQueryText(value: unknown): string | undefined {
  const normalized = readQueryString(value).trim()
  return normalized || undefined
}

export function readQueryNumber(value: unknown): number | undefined {
  const normalized = readQueryString(value).trim()
  if (!normalized) return undefined

  const numericValue = Number(normalized)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

export function readRequiredQueryNumber(
  query: Record<string, unknown>,
  key: string,
  message = `${key} is required`
): number {
  const value = readQueryNumber(query[key])
  if (!value) {
    throw Object.assign(new Error(message), { statusCode: 400 })
  }
  return value
}

export function readQueryDate(value: unknown): Date | undefined {
  const normalized = readQueryText(value)
  if (!normalized) return undefined

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function readQueryOption<TOption extends string>(
  value: unknown,
  options: readonly TOption[]
): TOption | undefined {
  const normalized = readQueryText(value)
  return normalized && options.includes(normalized as TOption) ? (normalized as TOption) : undefined
}

const SENSITIVE_QUERY_KEYS = new Set([
  'apikey',
  'authorization',
  'accesstoken',
  'password',
  'pwd',
  'refreshtoken',
  'signature',
  'token'
])
const SENSITIVE_QUERY_FRAGMENTS = [
  'authorization',
  'credential',
  'password',
  'passwd',
  'privatekey',
  'secret',
  'session',
  'signature',
  'token',
  'cookie'
] as const

function normalizeQueryKey(value: string): string {
  return value.toLowerCase().replace(/[-_]/g, '')
}

function isSensitiveQueryKey(value: string, extraKeys: ReadonlySet<string>): boolean {
  const normalized = normalizeQueryKey(value)
  return SENSITIVE_QUERY_KEYS.has(normalized)
    || extraKeys.has(normalized)
    || SENSITIVE_QUERY_FRAGMENTS.some(fragment => normalized.includes(fragment))
}

function sanitizeNestedUrlForLog(value: string, extraKeys: ReadonlySet<string>): string {
  if (!/^https?:\/\//i.test(value)) return value

  try {
    const url = new URL(value)
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveQueryKey(key, extraKeys)) {
        url.searchParams.set(key, '[REDACTED]')
      }
    }
    return url.toString()
  } catch {
    return value
  }
}

export function sanitizeQueryStringForLog(
  search: string,
  maxLength = 2_000,
  sensitiveKeys: readonly string[] = []
): string | null {
  const rawQuery = search.startsWith('?') ? search.slice(1) : search
  if (!rawQuery) return null

  const extraKeys = new Set(sensitiveKeys.map(normalizeQueryKey))
  const sanitizedQuery = new URLSearchParams()
  for (const [key, value] of new URLSearchParams(rawQuery)) {
    sanitizedQuery.append(
      key,
      isSensitiveQueryKey(key, extraKeys)
        ? '[REDACTED]'
        : sanitizeNestedUrlForLog(value, extraKeys)
    )
  }

  const serializedQuery = sanitizedQuery.toString()
  return serializedQuery ? serializedQuery.slice(0, Math.max(Math.trunc(maxLength), 0)) : null
}

export function sanitizeUrlForLog(
  value: string | null | undefined,
  maxLength = 1_000,
  sensitiveKeys: readonly string[] = []
): string | null {
  const normalized = value?.trim()
  if (!normalized) return null
  try {
    const url = new URL(normalized)
    const sanitized = sanitizeQueryStringForLog(
      url.search,
      Math.max(maxLength, 0),
      sensitiveKeys
    )
    url.search = sanitized ?? ''
    return url.toString().slice(0, Math.max(Math.trunc(maxLength), 0)) || null
  } catch {
    return normalized.slice(0, Math.max(Math.trunc(maxLength), 0)) || null
  }
}
