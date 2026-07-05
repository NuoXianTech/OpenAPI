import { describe, expect, it } from 'vitest'
import { toIsoString, toNullableIsoString } from '~~/server/utils/date'

describe('date utilities', () => {
  it('serializes Date, string, and numeric timestamp values to ISO', () => {
    const iso = '2026-07-05T00:00:00.000Z'

    expect(toIsoString(new Date(iso))).toBe(iso)
    expect(toIsoString(iso)).toBe(iso)
    expect(toIsoString(Date.parse(iso))).toBe(iso)
  })

  it('serializes nullable values safely', () => {
    const iso = '2026-07-05T00:00:00.000Z'

    expect(toNullableIsoString(null)).toBeNull()
    expect(toNullableIsoString(undefined)).toBeNull()
    expect(toNullableIsoString('')).toBeNull()
    expect(toNullableIsoString(iso)).toBe(iso)
  })

  it('keeps invalid date failures visible', () => {
    expect(() => toIsoString('not-a-date')).toThrow(RangeError)
  })
})
