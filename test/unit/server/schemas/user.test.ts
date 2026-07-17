import { describe, expect, it } from 'vitest'
import { userUpdatePreferencesSchema } from '~~/server/schemas/user'
import { DEFAULT_LOCALE } from '#shared/config/locale-defaults'

describe('user preference schemas', () => {
  it('accepts configured locales and rejects unknown values', () => {
    expect(userUpdatePreferencesSchema.safeParse({ locale: DEFAULT_LOCALE }).success).toBe(true)
    expect(userUpdatePreferencesSchema.safeParse({ locale: 'xx-invalid' }).success).toBe(false)
    expect(userUpdatePreferencesSchema.safeParse({}).success).toBe(false)
  })
})
