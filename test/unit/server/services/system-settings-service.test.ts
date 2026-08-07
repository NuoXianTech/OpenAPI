import { describe, expect, it, vi } from 'vitest'
import { SITE_SETTINGS_DEFAULTS } from '#shared/config/site-defaults'
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_NAMES,
  createSystemSettingsDefaults
} from '~~/server/config/system-settings'
import { systemSettingsService, toAdminSystemSettings } from '~~/server/services/system-settings-service'
import { toAdminOauthProviderSafe } from '~~/server/services/oauth-provider-service'

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

  it('allows an unset launch time and validates configured values', () => {
    const schema = SYSTEM_SETTING_DEFINITIONS.startTime.schema

    expect(SITE_SETTINGS_DEFAULTS.startTime).toBe('')
    expect(schema.safeParse('').success).toBe(true)
    expect(schema.safeParse('2026-08-07T12:30').success).toBe(true)
    expect(schema.safeParse('2026-02-30T12:30').success).toBe(false)
    expect(schema.safeParse('2026-08-07 12:30:00').success).toBe(false)
  })

  it('calculates public uptime in the application time zone', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(new Date(2026, 7, 7, 12, 30).getTime())

    try {
      expect(systemSettingsService.toPublicSettings({
        ...createSystemSettingsDefaults(),
        startTime: '2026-08-05T12:30'
      }).uptimeDays).toBe(2)
      expect(systemSettingsService.toPublicSettings({
        ...createSystemSettingsDefaults(),
        startTime: '2026-08-08T12:30'
      }).uptimeDays).toBeNull()
    } finally {
      now.mockRestore()
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
