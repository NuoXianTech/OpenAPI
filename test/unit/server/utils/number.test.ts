import { describe, expect, it } from 'vitest'
import { clampInteger, toInteger, toNullableNumber, toNumber } from '~~/server/utils/number'

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
