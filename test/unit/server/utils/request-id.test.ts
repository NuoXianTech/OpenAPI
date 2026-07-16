import { describe, expect, it } from 'vitest'
import { normalizeRequestId } from '../../../../server/utils/request-id'

describe('normalizeRequestId', () => {
  it('accepts canonical UUID values', () => {
    expect(normalizeRequestId('550E8400-E29B-41D4-A716-446655440000'))
      .toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('rejects values that cannot be stored in a UUID column', () => {
    expect(normalizeRequestId('not-a-uuid')).toBeNull()
    expect(normalizeRequestId('')).toBeNull()
    expect(normalizeRequestId(undefined)).toBeNull()
  })
})
