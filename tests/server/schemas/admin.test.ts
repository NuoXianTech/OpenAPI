import { describe, expect, it } from 'vitest'
import {
  adminAdjustCreditsSchema,
  adminUpdateApiSchema,
  adminUpdateUserSchema
} from '~~/shared/schemas/admin'

describe('adminUpdateUserSchema', () => {
  it('rejects invalid username and email updates', () => {
    expect(adminUpdateUserSchema.safeParse({
      id: 1,
      username: 'bad name',
      email: 'not-an-email'
    }).success).toBe(false)
  })

  it('requires at least one mutable field', () => {
    expect(adminUpdateUserSchema.safeParse({ id: 1 }).success).toBe(false)
  })
})

describe('adminUpdateApiSchema', () => {
  it('rejects negative guard limits and non-positive timeout values', () => {
    expect(adminUpdateApiSchema.safeParse({
      id: 1,
      rateLimitPerMinute: -1,
      dailyQuota: -1,
      timeoutMs: 0
    }).success).toBe(false)
  })
})

describe('adminAdjustCreditsSchema', () => {
  it('requires explicit all-user confirmation for empty user selection', () => {
    expect(adminAdjustCreditsSchema.safeParse({
      userIds: [],
      operation: 'grant',
      amount: 1
    }).success).toBe(false)

    expect(adminAdjustCreditsSchema.safeParse({
      scope: 'all',
      confirmAll: true,
      userIds: [],
      operation: 'grant',
      amount: 1
    }).success).toBe(true)
  })

  it('requires selected user ids when scope is selected', () => {
    expect(adminAdjustCreditsSchema.safeParse({
      scope: 'selected',
      userIds: [],
      operation: 'grant',
      amount: 1
    }).success).toBe(false)
  })
})
