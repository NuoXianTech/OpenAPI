import { describe, expect, it } from 'vitest'
import { formatCompactCount, formatCount, formatPercent } from '@/utils/number-format'

describe('number format utilities', () => {
  it('formats counts with a stable locale', () => {
    expect(formatCount(1234567)).toBe('1,234,567')
    expect(formatCount(-1234)).toBe('-1,234')
  })

  it('formats compact non-negative integer counts', () => {
    expect(formatCompactCount(9999.9)).toBe('9,999')
    expect(formatCompactCount(12500)).toBe('1.3万')
    expect(formatCompactCount(-1)).toBe('0')
  })

  it('formats percentage-point values with configurable precision', () => {
    expect(formatPercent(98.126)).toBe('98.13%')
    expect(formatPercent(98.126, 1)).toBe('98.1%')
  })
})
