import { describe, expect, it } from 'vitest'
import {
  adminAdjustCreditsSchema,
  adminUpdateApiSchema,
  adminUpdateUserSchema
} from '~~/server/schemas/admin'
import { API_STATUS } from '~~/shared/config/api-status'

describe('admin schemas', () => {
  it('rejects unsafe admin mutations and requires explicit bulk confirmation', () => {
    expect(adminUpdateUserSchema.safeParse({
      id: 1,
      username: 'bad name',
      email: 'not-an-email'
    }).success).toBe(false)

    expect(adminUpdateUserSchema.safeParse({ id: 1 }).success).toBe(false)

    expect(adminUpdateApiSchema.safeParse({
      id: 1,
      rateLimitPerMinute: -1,
      dailyQuota: -1,
      timeoutMs: 0
    }).success).toBe(false)

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

    expect(adminAdjustCreditsSchema.safeParse({
      scope: 'selected',
      userIds: [],
      operation: 'grant',
      amount: 1
    }).success).toBe(false)
  })

  it('accepts automatic API status and rejects unknown status values', () => {
    expect(adminUpdateApiSchema.safeParse({
      id: 1,
      status: API_STATUS.automatic
    }).success).toBe(true)

    expect(adminUpdateApiSchema.safeParse({
      id: 1,
      status: 999
    }).success).toBe(false)
  })
})
