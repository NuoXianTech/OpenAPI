import { describe, expect, it } from 'vitest'
import { getLocalMonthRange } from '~~/server/utils/local-time'

describe('local month range', () => {
  it('creates a left-closed, right-open range for a valid month', () => {
    const range = getLocalMonthRange('2026-07')

    expect(range?.month).toBe('2026-07')
    expect(range?.start.getFullYear()).toBe(2026)
    expect(range?.start.getMonth()).toBe(6)
    expect(range?.start.getDate()).toBe(1)
    expect(range?.end.getFullYear()).toBe(2026)
    expect(range?.end.getMonth()).toBe(7)
    expect(range?.end.getDate()).toBe(1)
  })

  it('handles the December to January boundary', () => {
    const range = getLocalMonthRange('2026-12')

    expect(range?.end.getFullYear()).toBe(2027)
    expect(range?.end.getMonth()).toBe(0)
  })

  it.each(['', '2026-7', '2026-00', '2026-13', 'not-a-month', '1969-12'])(
    'rejects an invalid month: %s',
    (month) => {
      expect(getLocalMonthRange(month)).toBeNull()
    }
  )
})
