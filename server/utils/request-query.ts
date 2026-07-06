type RequestQueryValue = string | string[] | undefined

export interface RequestQuery {
  [key: string]: RequestQueryValue
}

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
