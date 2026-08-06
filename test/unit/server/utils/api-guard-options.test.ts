import { describe, expect, it } from 'vitest'
import { normalizeIgnoredStatisticsStatusCodes } from '~~/server/utils/api-statistics'

describe('OpenAPI handler statistics options', () => {
  it('keeps unique integer HTTP statuses and ignores invalid values', () => {
    expect(normalizeIgnoredStatisticsStatusCodes([
      422.9,
      504,
      422,
      99,
      600,
      Number.NaN,
      Number.POSITIVE_INFINITY
    ])).toEqual([422, 504])
  })

  it('returns an empty list when no statuses are declared', () => {
    expect(normalizeIgnoredStatisticsStatusCodes()).toEqual([])
  })
})
