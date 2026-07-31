import { describe, expect, it, vi } from 'vitest'
import { SITE_SETTINGS_DEFAULTS } from '#shared/config/site-defaults'
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_NAMES,
  createSystemSettingsDefaults
} from '~~/server/config/system-settings'
import { toAdminSystemSettings } from '~~/server/services/system-settings-service'
import { toAdminOauthProviderSafe } from '~~/server/services/oauth-provider-service'

vi.mock('h3', () => ({
  createError: (input: unknown) => Object.assign(new Error('h3 error'), input)
}))

describe('system settings', () => {
  it('keeps the registry complete and database keys unique', () => {
    const defaults = createSystemSettingsDefaults()
    const databaseKeys = SYSTEM_SETTING_NAMES.map(name => SYSTEM_SETTING_DEFINITIONS[name].key)

    expect(defaults).toEqual(SITE_SETTINGS_DEFAULTS)
    expect(new Set(databaseKeys).size).toBe(databaseKeys.length)

    for (const name of SYSTEM_SETTING_NAMES) {
      const definition = SYSTEM_SETTING_DEFINITIONS[name]
      expect(definition.schema.safeParse(definition.default).success, name).toBe(true)
      expect(definition.key.length, name).toBeLessThanOrEqual(150)
      expect(definition.description.length, name).toBeLessThanOrEqual(500)
      expect(definition.secret && definition.public, name).toBe(false)
    }
  })

  it('redacts write-only secrets from admin responses', () => {
    const settings = {
      ...createSystemSettingsDefaults(),
      smtpPass: 'smtp-secret',
      oauthGithubClientId: 'github-client',
      oauthGithubClientSecret: 'github-secret',
      oauthGithubEnabled: true,
      oauthQqClientId: 'qq-client',
      oauthQqClientSecret: '',
      turnstileSiteKey: 'site-key',
      turnstileSecretKey: 'turnstile-secret',
      turnstileLoginEnabled: true
    }

    const safe = toAdminSystemSettings(settings)

    expect('smtpPass' in safe).toBe(false)
    expect('oauthGithubClientSecret' in safe).toBe(false)
    expect('oauthQqClientSecret' in safe).toBe(false)
    expect('turnstileSecretKey' in safe).toBe(false)
    expect(safe.secrets).toEqual({
      hasSmtpPass: true,
      hasOauthGithubClientSecret: true,
      hasOauthQqClientSecret: false,
      hasTurnstileSecretKey: true
    })

    expect(toAdminOauthProviderSafe({
      provider: 'github',
      clientId: 'github-client',
      clientSecret: 'github-secret',
      isEnabled: true
    })).toMatchObject({
      provider: 'github',
      clientId: 'github-client',
      clientSecret: '***',
      isEnabled: true
    })

    expect(toAdminOauthProviderSafe({
      provider: 'qq',
      clientId: 'qq-client',
      clientSecret: '',
      isEnabled: false
    }).clientSecret).toBe('')
  })
})
