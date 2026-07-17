import { DEFAULT_LOCALE } from '#shared/config/locale-defaults'

const countFormatters = new Map<string, Intl.NumberFormat>()
const compactCountFormatters = new Map<string, Intl.NumberFormat>()

function getCountFormatter(locale: string): Intl.NumberFormat {
  const cachedFormatter = countFormatters.get(locale)
  if (cachedFormatter) return cachedFormatter

  const formatter = new Intl.NumberFormat(locale)
  countFormatters.set(locale, formatter)
  return formatter
}

function getCompactCountFormatter(locale: string): Intl.NumberFormat {
  const cachedFormatter = compactCountFormatters.get(locale)
  if (cachedFormatter) return cachedFormatter

  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1
  })
  compactCountFormatters.set(locale, formatter)
  return formatter
}

export function formatCompactCount(value = 0, locale = DEFAULT_LOCALE): string {
  const normalizedValue = Math.max(0, Math.floor(value))
  if (normalizedValue < 10000) return formatCount(normalizedValue, locale)
  return getCompactCountFormatter(locale).format(normalizedValue)
}

export function formatCount(value = 0, locale = DEFAULT_LOCALE): string {
  return getCountFormatter(locale).format(value)
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`
}
