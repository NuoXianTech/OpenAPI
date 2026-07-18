import { describe, expect, it } from 'vitest'
import type { OauthProviderRow } from '~~/server/services/oauth-provider-service'
import { createOauthSettingsAuditDetail } from '~~/server/utils/oauth-audit'

function provider(overrides: Partial<OauthProviderRow> = {}): OauthProviderRow {
  return {
    provider: 'github',
    clientId: 'client-id',
    clientSecret: 'secret',
    isEnabled: true,
    ...overrides
  }
}

describe('createOauthSettingsAuditDetail', () => {
  it('returns no detail when OAuth settings are unchanged', () => {
    expect(createOauthSettingsAuditDetail(false, [provider()], false, [provider()])).toBeNull()
  })

  it('records changed fields without exposing secret values', () => {
    const detail = createOauthSettingsAuditDetail(
      false,
      [provider()],
      true,
      [provider({ clientSecret: 'new-secret', isEnabled: false })]
    )

    expect(detail).toEqual({
      changes: {
        forceBinding: { from: false, to: true },
        providers: [{
          provider: 'github',
          changedFields: ['clientSecret', 'isEnabled'],
          clientSecretChanged: true,
          isEnabled: { from: true, to: false }
        }]
      }
    })
    expect(JSON.stringify(detail)).not.toContain('new-secret')
  })
})
