import { describe, expect, it } from 'vitest'
import { toAdminSiteSettings } from '~~/server/service/siteSettingsService'

describe('toAdminSiteSettings', () => {
  it('redacts write-only secrets from admin responses', () => {
    const row = {
      id: 1,
      scope: 'default',
      siteUrl: 'https://example.com',
      siteImg: '/logo.webp',
      siteName: 'OpenAPI',
      siteDescription: 'API platform',
      startTime: '2026-01-01',
      registrationMode: 'open',
      defaultRegisterCredits: 0,
      registerEmailFilterMode: 'off',
      registerEmailFilterList: '',
      sessionMaxAgeSeconds: 86400,
      sessionAbsoluteMaxAgeSeconds: 604800,
      sessionRememberMaxAgeSeconds: 2592000,
      emailVerifyExpiresInMinutes: 30,
      emailActivationEnabled: true,
      passwordResetExpiresInMinutes: 30,
      passwordResetEnabled: true,
      icpBeian: null,
      policeBeian: null,
      termsUrl: null,
      privacyUrl: null,
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpSecure: true,
      smtpUser: 'mailer',
      smtpPass: 'smtp-secret',
      smtpFrom: 'no-reply@example.com',
      smtpFromName: '',
      smtpReplyTo: '',
      smtpPoolMaxAgeSeconds: 0,
      oauthForceBinding: false,
      oauthGithubClientId: 'github-client',
      oauthGithubClientSecret: 'github-secret',
      oauthGithubEnabled: true,
      oauthQqClientId: 'qq-client',
      oauthQqClientSecret: '',
      oauthQqEnabled: false,
      turnstileSiteKey: 'site-key',
      turnstileSecretKey: 'turnstile-secret',
      turnstileLoginEnabled: true,
      turnstileRegisterEnabled: false,
      turnstileAdminLoginEnabled: false,
      turnstilePasswordResetEnabled: false,
      turnstileCheckinEnabled: false,
      checkinEnabled: true,
      checkinCooldownMode: 'hours',
      checkinRefreshHours: 24,
      checkinFixedRefreshTime: '00:00',
      checkinMode: 'fixed',
      checkinAmountFixed: 10,
      checkinAmountMin: 5,
      checkinAmountMax: 20,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z')
    }

    const safe = toAdminSiteSettings(row)

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
  })
})
