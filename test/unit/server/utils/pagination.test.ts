import { describe, expect, it } from 'vitest'
import { normalizePagination } from '~~/server/utils/pagination'

describe('pagination utilities', () => {
  it('normalizes defaults, clamps bounds, and parses query values', () => {
    expect(normalizePagination({})).toEqual({ limit: 50, offset: 0 })
    expect(normalizePagination({ limit: 999, offset: -10 })).toEqual({ limit: 200, offset: 0 })
    expect(normalizePagination({ limit: 0.2, offset: 4.8 })).toEqual({ limit: 1, offset: 4 })
    expect(normalizePagination({}, { defaultLimit: 10, maxLimit: 30 })).toEqual({ limit: 10, offset: 0 })
    expect(normalizePagination({ limit: 100 }, { defaultLimit: 10, maxLimit: 30 })).toEqual({ limit: 30, offset: 0 })

    expect(normalizePagination({ limit: '25', offset: ['8'] })).toEqual({ limit: 25, offset: 8 })
    expect(normalizePagination({ limit: 'many', offset: 'soon' })).toEqual({ limit: 50, offset: 0 })
  })
})
