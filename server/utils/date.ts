export function toIsoString(value: Date | string | number): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export function toNullableIsoString(value: Date | string | number | null | undefined): string | null {
  return value === null || value === undefined || value === '' ? null : toIsoString(value)
}
