import { eq } from 'drizzle-orm'
import type {
  PublicSiteSettings,
  PublicTurnstileSettings
} from '#shared/types/site-settings'
import { PUBLIC_SITE_DEFAULTS } from '~~/shared/config/siteDefaults'
import { siteSettings } from '~~/server/db/schema/system'

const DEFAULT_SCOPE = 'default'

export type { PublicSiteSettings, PublicTurnstileSettings }

export interface SiteSettingsUpsertInput {
  siteUrl?: string
  siteImg?: string
  siteName?: string
  siteDescription?: string
  startTime?: string
  icpBeian?: string
  policeBeian?: string
  termsUrl?: string
  privacyUrl?: string
  sessionMaxAgeSeconds?: number
  sessionAbsoluteMaxAgeSeconds?: number
  sessionRememberMaxAgeSeconds?: number
  registrationMode?: 'open' | 'invite' | 'closed'
  registerEmailFilterList?: string
  registerEmailFilterMode?: 'off' | 'whitelist' | 'blacklist'
  defaultRegisterCredits?: number
  emailVerifyExpiresInMinutes?: number
  emailActivationEnabled?: boolean
  passwordResetExpiresInMinutes?: number
  passwordResetEnabled?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  smtpFrom?: string
  smtpFromName?: string
  smtpReplyTo?: string
  smtpPoolMaxAgeSeconds?: number
  oauthForceBinding?: boolean
  // 第三方登录 · per-provider 配置（明文）；undefined = 不改动，其他值（含空串）直接覆盖
  oauthGithubClientId?: string
  oauthGithubClientSecret?: string
  oauthGithubEnabled?: boolean
  oauthQqClientId?: string
  oauthQqClientSecret?: string
  oauthQqEnabled?: boolean
  turnstileSiteKey?: string
  // 明文 secret；undefined = 不改动，其他值（含空串）直接覆盖
  turnstileSecretKey?: string
  turnstileLoginEnabled?: boolean
  turnstileRegisterEnabled?: boolean
  turnstileAdminLoginEnabled?: boolean
  turnstilePasswordResetEnabled?: boolean
  turnstileCheckinEnabled?: boolean
  checkinEnabled?: boolean
  checkinCooldownMode?: 'hours' | 'fixed_time'
  checkinRefreshHours?: number
  checkinFixedRefreshTime?: string
  checkinMode?: 'fixed' | 'range'
  checkinAmountFixed?: number
  checkinAmountMin?: number
  checkinAmountMax?: number
}

function buildInitialDefaults() {
  return {
    scope: DEFAULT_SCOPE,
    ...PUBLIC_SITE_DEFAULTS,
    sessionMaxAgeSeconds: 60 * 60 * 24,
    sessionAbsoluteMaxAgeSeconds: 60 * 60 * 24 * 7,
    sessionRememberMaxAgeSeconds: 60 * 60 * 24 * 30,
    registerEmailFilterMode: 'off',
    registerEmailFilterList: '',
    emailVerifyExpiresInMinutes: 30,
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'no-reply@example.com'
  }
}

function toPublicTurnstile(settings: {
  turnstileSiteKey: string
  turnstileSecretKey: string
  turnstileLoginEnabled: boolean
  turnstileRegisterEnabled: boolean
  turnstileAdminLoginEnabled: boolean
  turnstilePasswordResetEnabled: boolean
  turnstileCheckinEnabled: boolean
}): PublicTurnstileSettings {
  // 无总开关：配齐 siteKey / secretKey 即视为可用，具体场景由各 turnstileXEnabled 决定
  const configured = Boolean(settings.turnstileSiteKey) && Boolean(settings.turnstileSecretKey)
  const enabled = configured
  return {
    enabled,
    siteKey: enabled ? settings.turnstileSiteKey : '',
    login: enabled && settings.turnstileLoginEnabled,
    register: enabled && settings.turnstileRegisterEnabled,
    adminLogin: enabled && settings.turnstileAdminLoginEnabled,
    passwordReset: enabled && settings.turnstilePasswordResetEnabled,
    checkin: enabled && settings.turnstileCheckinEnabled
  }
}

type SiteSettingsRow = typeof siteSettings.$inferSelect

export interface AdminSiteSettingsSecrets {
  hasSmtpPass: boolean
  hasOauthGithubClientSecret: boolean
  hasOauthQqClientSecret: boolean
  hasTurnstileSecretKey: boolean
}

export interface AdminSiteSettings extends Omit<
  SiteSettingsRow,
  'smtpPass' | 'oauthGithubClientSecret' | 'oauthQqClientSecret' | 'turnstileSecretKey'
> {
  secrets: AdminSiteSettingsSecrets
}

export function toAdminSiteSettings(settings: SiteSettingsRow): AdminSiteSettings {
  const {
    smtpPass,
    oauthGithubClientSecret,
    oauthQqClientSecret,
    turnstileSecretKey,
    ...safe
  } = settings

  return {
    ...safe,
    secrets: {
      hasSmtpPass: smtpPass.length > 0,
      hasOauthGithubClientSecret: oauthGithubClientSecret.length > 0,
      hasOauthQqClientSecret: oauthQqClientSecret.length > 0,
      hasTurnstileSecretKey: turnstileSecretKey.length > 0
    }
  }
}

// getOrCreate 挂在鉴权热路径上：每个非「记住我」请求都要读 3 个会话时长整数（见
// server/utils/auth.ts），SSR 还会经 /api/auth/me 再触发一次。但 default scope 只有
// 一行、几乎从不变更，故沿用 apiService 的 { value, expiresAt } 短 TTL 缓存避免反复查库，
// update() 时失效。整站全局配置（非 per-user），共享模块级缓存是安全的。
const SITE_SETTINGS_CACHE_TTL_MS = 10_000
let settingsCache: { value: SiteSettingsRow, expiresAt: number } | null = null

function cacheSettings(value: SiteSettingsRow) {
  settingsCache = { value, expiresAt: Date.now() + SITE_SETTINGS_CACHE_TTL_MS }
  return value
}

export const siteSettingsService = {
  async getOrCreate() {
    if (settingsCache && settingsCache.expiresAt > Date.now()) {
      return settingsCache.value
    }

    const exists = await db.select().from(siteSettings)
      .where(eq(siteSettings.scope, DEFAULT_SCOPE))
      .limit(1)

    if (exists[0]) {
      return cacheSettings(exists[0])
    }

    const defaults = buildInitialDefaults()

    try {
      const inserted = await db.insert(siteSettings).values(defaults).returning()
      if (inserted[0]) {
        return cacheSettings(inserted[0])
      }
    } catch {
      // Ignore duplicate insert races and fallback to a fresh read.
    }

    const reloaded = await db.select().from(siteSettings)
      .where(eq(siteSettings.scope, DEFAULT_SCOPE))
      .limit(1)

    if (!reloaded[0]) {
      throw new Error('failed to initialize site settings')
    }

    return cacheSettings(reloaded[0])
  },

  async getPublicSettings(): Promise<PublicSiteSettings> {
    const settings = await this.getOrCreate()
    return this.toPublicSettings(settings)
  },

  toPublicSettings(settings: SiteSettingsRow): PublicSiteSettings {
    return {
      siteUrl: settings.siteUrl,
      siteImg: settings.siteImg,
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      startTime: settings.startTime,
      icpBeian: settings.icpBeian || null,
      policeBeian: settings.policeBeian || null,
      termsUrl: settings.termsUrl || null,
      privacyUrl: settings.privacyUrl || null,
      registrationMode: settings.registrationMode,
      passwordResetEnabled: settings.passwordResetEnabled,
      turnstile: toPublicTurnstile(settings)
    }
  },

  // 给后台用：敏感字段只返回是否已配置，具体值保持只写。
  async getForAdmin() {
    return toAdminSiteSettings(await this.getOrCreate())
  },

  async update(input: SiteSettingsUpsertInput) {
    const current = await this.getOrCreate()

    const updated = await db.update(siteSettings)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(siteSettings.id, current.id))
      .returning()

    // 失效缓存：下次 getOrCreate 重新读库，避免后台改完设置后最多 10s 不生效
    settingsCache = null

    return updated[0] || current
  }
}
