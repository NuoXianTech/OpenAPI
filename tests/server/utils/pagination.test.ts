import { describe, expect, it } from 'vitest'
import { normalizePagination, parsePaginationQuery } from '~~/server/utils/pagination'

describe('normalizePagination', () => {
  it('uses stable defaults when input is missing', () => {
    expect(normalizePagination({})).toEqual({ limit: 50, offset: 0 })
  })

  it('clamps limit and offset to safe integer bounds', () => {
    expect(normalizePagination({ limit: 999, offset: -10 })).toEqual({ limit: 200, offset: 0 })
    expect(normalizePagination({ limit: 0.2, offset: 4.8 })).toEqual({ limit: 1, offset: 4 })
  })

  it('supports custom defaults and maximum limits', () => {
    expect(normalizePagination({}, { defaultLimit: 10, maxLimit: 30 })).toEqual({ limit: 10, offset: 0 })
    expect(normalizePagination({ limit: 100 }, { defaultLimit: 10, maxLimit: 30 })).toEqual({ limit: 30, offset: 0 })
  })
})

describe('parsePaginationQuery', () => {
  it('reads strings and arrays from h3 query objects', () => {
    expect(parsePaginationQuery({ limit: '25', offset: ['8'] })).toEqual({ limit: 25, offset: 8 })
  })

  it('falls back when values are invalid numeric text', () => {
    expect(parsePaginationQuery({ limit: 'many', offset: 'soon' })).toEqual({ limit: 50, offset: 0 })
  })
})
