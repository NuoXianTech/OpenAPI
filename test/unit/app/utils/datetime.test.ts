import { describe, expect, it } from 'vitest'
import { dateTimeLocalToCalendar } from '~/utils/datetime'

describe('datetime utilities', () => {
  it('parses valid local date-time values without normalizing invalid dates', () => {
    expect(dateTimeLocalToCalendar('2026-08-07T12:30')?.toString()).toBe('2026-08-07T12:30:00')
    expect(dateTimeLocalToCalendar('2026-02-30T12:30')).toBeUndefined()
    expect(dateTimeLocalToCalendar('2026-08-07 12:30:00')).toBeUndefined()
  })
})
