import { describe, expect, it } from 'vitest'
import { firstRow } from '~~/server/utils/row'

describe('row utilities', () => {
  it('returns the first row or null', () => {
    expect(firstRow([{ id: 1 }, { id: 2 }])).toEqual({ id: 1 })
    expect(firstRow([])).toBeNull()
  })
})
