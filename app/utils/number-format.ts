const countFormatter = new Intl.NumberFormat('zh-CN')
const compactCountFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1
})

export function formatCompactCount(value = 0): string {
  const normalizedValue = Math.max(0, Math.floor(value))
  if (normalizedValue < 10000) return formatCount(normalizedValue)
  return compactCountFormatter.format(normalizedValue)
}

export function formatCount(value = 0): string {
  return countFormatter.format(value)
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`
}
