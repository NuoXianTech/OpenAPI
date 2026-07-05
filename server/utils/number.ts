export function toNumber(value: unknown, fallback = 0): number {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : null
}

export function toInteger(value: unknown, fallback: number): number {
  return Math.trunc(toNumber(value, fallback))
}

export function clampInteger(value: unknown, min: number, max: number, fallback = min): number {
  const normalizedMin = Math.trunc(min)
  const normalizedMax = Math.max(Math.trunc(max), normalizedMin)
  return Math.min(Math.max(toInteger(value, fallback), normalizedMin), normalizedMax)
}
