import { describe, expect, it } from 'vitest'
import { getSqlState } from '~~/server/utils/database-error'

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
