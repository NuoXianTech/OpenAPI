const compactCountFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1
})

export function formatCompactCount(value = 0): string {
  const normalizedValue = Math.max(0, Math.floor(value))
  if (normalizedValue < 10000) return normalizedValue.toLocaleString('zh-CN')
  return compactCountFormatter.format(normalizedValue)
}
