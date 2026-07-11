import { describe, expect, it } from 'vitest'
import { getSqlState } from '~~/server/utils/database-error'
import { toIsoString, toNullableIsoString } from '~~/server/utils/date'
import { clampInteger, toInteger, toNullableNumber, toNumber } from '~~/server/utils/number'
import { firstRow } from '~~/server/utils/row'

describe('getSqlState', () => {
  it('reads direct and nested database error codes', () => {
    expect(getSqlState({ code: '23505' })).toBe('23505')
    expect(getSqlState({ cause: { cause: { code: '42P04' } } })).toBe('42P04')
  })

  it('stops safely on cyclic causes', () => {
    const error: { cause?: unknown } = {}
    error.cause = error

    expect(getSqlState(error)).toBeUndefined()
  })
})

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

describe('number utilities', () => {
  it('normalizes finite numeric values', () => {
    expect(toNumber('12.5')).toBe(12.5)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
    expect(toNumber('')).toBe(0)
    expect(toNumber('bad', 7)).toBe(7)
  })

  it('normalizes nullable numeric values', () => {
    expect(toNullableNumber(null)).toBeNull()
    expect(toNullableNumber(undefined)).toBeNull()
    expect(toNullableNumber('9')).toBe(9)
    expect(toNullableNumber('bad')).toBeNull()
  })

  it('normalizes integers and clamps ranges', () => {
    expect(toInteger('9.8', 1)).toBe(9)
    expect(toInteger('bad', 3)).toBe(3)
    expect(clampInteger(99, 1, 10, 5)).toBe(10)
    expect(clampInteger('bad', 1, 10, 5)).toBe(5)
  })
})

describe('row utilities', () => {
  it('returns the first row or null', () => {
    expect(firstRow([{ id: 1 }, { id: 2 }])).toEqual({ id: 1 })
    expect(firstRow([])).toBeNull()
  })
})
