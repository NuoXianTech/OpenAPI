import { describe, expect, it } from 'vitest'
import { adminUpdateOauthProvidersSchema } from '~~/server/schemas/admin/oauth-providers'

describe('adminUpdateOauthProvidersSchema', () => {
  it('accepts one configuration for every supported provider', () => {
    const result = adminUpdateOauthProvidersSchema.safeParse({
      oauthForceBinding: true,
      providers: [
        { provider: 'github', clientId: 'github-id', isEnabled: true, clientSecret: 'secret' },
        { provider: 'qq', clientId: '', isEnabled: false }
      ]
    })

    expect(result.success).toBe(true)
  })

  it('rejects duplicate providers even when the item count is valid', () => {
    const result = adminUpdateOauthProvidersSchema.safeParse({
      oauthForceBinding: false,
      providers: [
        { provider: 'github', clientId: 'first', isEnabled: false },
        { provider: 'github', clientId: 'second', isEnabled: false }
      ]
    })

    expect(result.success).toBe(false)
  })
})
