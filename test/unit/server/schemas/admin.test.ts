import { describe, expect, it } from 'vitest'
import {
  adminAdjustCreditsSchema,
  adminInitialProfileSchema,
  adminUpdateApiSchema,
  adminUpdateSiteSettingsSchema,
  adminUpdateUserSchema
} from '~~/server/schemas/admin'
import { API_STATUS } from '#shared/config/api-status'

describe('admin schemas', () => {
  it('rejects unsafe admin mutations and requires explicit credit targets', () => {
    expect(adminUpdateUserSchema.safeParse({
      id: 1,
      username: 'bad name',
      email: 'not-an-email'
    }).success).toBe(false)

    expect(adminUpdateUserSchema.safeParse({
      id: 1,
      username: 'new-name',
      email: 'valid@example.com'
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
      userIds: [1, 2],
      operation: 'grant',
      amount: 1
    }).success).toBe(true)
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

  it('requires initial admin password while accepting default or custom username and email', () => {
    expect(adminInitialProfileSchema.safeParse({
      username: 'admin',
      email: 'admin@openapi.com'
    }).success).toBe(false)

    expect(adminInitialProfileSchema.safeParse({
      username: 'admin',
      email: 'admin@openapi.com',
      password: 'new-admin-password'
    }).success).toBe(true)

    expect(adminInitialProfileSchema.safeParse({
      username: 'owner',
      email: 'owner@example.com',
      password: 'new-admin-password'
    }).success).toBe(true)
  })

  it('validates general settings without accepting OAuth-owned fields', () => {
    expect(adminUpdateSiteSettingsSchema.safeParse({
      siteName: 'OpenAPI Platform',
      checkinMode: 'range',
      checkinAmountMin: 5,
      checkinAmountMax: 20
    }).success).toBe(true)

    expect(adminUpdateSiteSettingsSchema.safeParse({
      oauthGithubEnabled: true
    }).success).toBe(false)

    expect(adminUpdateSiteSettingsSchema.safeParse({
      oauthForceBinding: true
    }).success).toBe(false)

    expect(adminUpdateSiteSettingsSchema.safeParse({
      unknownSetting: true
    }).success).toBe(false)

    expect(adminUpdateSiteSettingsSchema.safeParse({
      checkinMode: 'range',
      checkinAmountMin: 20,
      checkinAmountMax: 5
    }).success).toBe(false)

    expect(adminUpdateApiSchema.safeParse({ id: 1, docUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(adminUpdateApiSchema.safeParse({ id: 1, docUrl: 'https://example.com/docs' }).success).toBe(true)
  })
})
