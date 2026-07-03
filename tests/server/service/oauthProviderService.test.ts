import { describe, expect, it, vi } from 'vitest'
import { toAdminOauthProviderSafe } from '~~/server/service/oauthProviderService'

vi.mock('h3', () => ({
  createError: (input: unknown) => Object.assign(new Error('h3 error'), input)
}))

describe('toAdminOauthProviderSafe', () => {
  it('redacts provider client secrets for admin responses', () => {
    expect(toAdminOauthProviderSafe({
      provider: 'github',
      clientId: 'github-client',
      clientSecret: 'github-secret',
      isEnabled: true
    })).toEqual({
      provider: 'github',
      clientId: 'github-client',
      clientSecret: '***',
      isEnabled: true
    })
  })

  it('keeps empty provider client secrets empty', () => {
    expect(toAdminOauthProviderSafe({
      provider: 'qq',
      clientId: 'qq-client',
      clientSecret: '',
      isEnabled: false
    })).toEqual({
      provider: 'qq',
      clientId: 'qq-client',
      clientSecret: '',
      isEnabled: false
    })
  })
})
