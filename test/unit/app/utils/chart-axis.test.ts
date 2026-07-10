import { describe, expect, it } from 'vitest'
import {
  createChartIndexedTickFormatter,
  formatChartIntegerTick,
  truncateChartAxisLabel
} from '~~/app/utils/chart-axis'

describe('chart axis utilities', () => {
  it('formats indexed labels with live rows and safe bounds', () => {
    let rows = [{ label: 'first' }, { label: 'second' }]
    const formatTick = createChartIndexedTickFormatter(() => rows, row => row.label)

    expect(formatTick(-10)).toBe('first')
    expect(formatTick(0.6)).toBe('second')
    expect(formatTick(99)).toBe('second')
    expect(formatTick('native')).toBe('native')
    expect(formatTick(new Date())).toBe('')

    rows = []
    expect(formatTick(0)).toBe('')
  })

  it('formats integer ticks and truncates long labels', () => {
    expect(formatChartIntegerTick(8.6)).toBe('9')
    expect(formatChartIntegerTick(new Date())).toBe('')
    expect(truncateChartAxisLabel('short')).toBe('short')
    expect(truncateChartAxisLabel('very-long-name')).toBe('very-l…')
  })
})
