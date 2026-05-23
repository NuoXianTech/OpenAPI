import { eq } from 'drizzle-orm'
import type {
  PublicAnnouncementSettings,
  PublicSiteSettings,
  PublicTurnstileSettings
} from '#shared/types/siteSettings'
import { PUBLIC_SITE_DEFAULTS } from '~~/shared/config/siteDefaults'
import { siteSettings } from '~~/server/db/schema/system'
import { encryptSecret, isSecretMask, maskSecret } from '~~/server/utils/oauthCrypto'

const DEFAULT_SCOPE = 'default'

export type { PublicAnnouncementSettings, PublicSiteSettings, PublicTurnstileSettings }

export interface SiteSettingsUpsertInput {
  siteUrl?: string
  siteImg?: string
  siteName?: string
  siteDescription?: string
  startTime?: string
  sessionMaxAgeSeconds?: number
  sessionAbsoluteMaxAgeSeconds?: number
  sessionRememberMaxAgeSeconds?: number
  registerEmailFilterList?: string
  registerEmailFilterMode?: 'off' | 'whitelist' | 'blacklist'
  defaultRegisterCredits?: number
  emailVerifyExpiresInMinutes?: number
  passwordResetExpiresInMinutes?: number
  passwordResetEnabled?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  smtpFrom?: string
  oauthLoginEnabled?: boolean
  oauthForceBinding?: boolean
  turnstileEnabled?: boolean
  turnstileSiteKey?: string
  // 明文 secret；由 service 层加密后落库。传入 mask（'***'）或 undefined 都表示"不改动"
  turnstileSecretKey?: string
  turnstileLoginEnabled?: boolean
  turnstileRegisterEnabled?: boolean
  turnstileAdminLoginEnabled?: boolean
  turnstilePasswordResetEnabled?: boolean
  announcementShowOnHome?: boolean
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
  turnstileEnabled: boolean
  turnstileSiteKey: string
  turnstileSecretKey: string
  turnstileLoginEnabled: boolean
  turnstileRegisterEnabled: boolean
  turnstileAdminLoginEnabled: boolean
  turnstilePasswordResetEnabled: boolean
}): PublicTurnstileSettings {
  // 没配 siteKey / secretKey 时即便 enabled=true 也视为未启用，避免前端白屏。
  const configured = Boolean(settings.turnstileSiteKey) && Boolean(settings.turnstileSecretKey)
  const enabled = settings.turnstileEnabled && configured
  return {
    enabled,
    siteKey: enabled ? settings.turnstileSiteKey : '',
    login: enabled && settings.turnstileLoginEnabled,
    register: enabled && settings.turnstileRegisterEnabled,
    adminLogin: enabled && settings.turnstileAdminLoginEnabled,
    passwordReset: enabled && settings.turnstilePasswordResetEnabled
  }
}

type SiteSettingsRow = typeof siteSettings.$inferSelect

export const siteSettingsService = {
  async getOrCreate() {
    const exists = await db.select().from(siteSettings)
      .where(eq(siteSettings.scope, DEFAULT_SCOPE))
      .limit(1)

    if (exists[0]) {
      return exists[0]
    }

    const defaults = buildInitialDefaults()

    try {
      const inserted = await db.insert(siteSettings).values(defaults).returning()
      if (inserted[0]) {
        return inserted[0]
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

    return reloaded[0]
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
      oauthLoginEnabled: settings.oauthLoginEnabled,
      passwordResetEnabled: settings.passwordResetEnabled,
      turnstile: toPublicTurnstile(settings),
      announcement: {
        showOnHome: settings.announcementShowOnHome
      }
    }
  },

  // 给后台用：保留所有字段，但把 turnstileSecretKey mask 掉
  async getForAdmin() {
    const settings = await this.getOrCreate()
    if (settings.turnstileSecretKey) {
      settings.turnstileSecretKey = maskSecret(settings.turnstileSecretKey)
    }
    return settings
  },

  async update(input: SiteSettingsUpsertInput) {
    const current = await this.getOrCreate()

    const { turnstileSecretKey, ...rest } = input
    const patch: Record<string, unknown> = { ...rest }

    // secret：空串 = 清空；mask 或 undefined = 保持原值；其他 = 加密存储
    if (turnstileSecretKey !== undefined) {
      if (turnstileSecretKey === '') {
        patch.turnstileSecretKey = ''
      } else if (!isSecretMask(turnstileSecretKey)) {
        patch.turnstileSecretKey = encryptSecret(turnstileSecretKey)
      }
    }

    const updated = await db.update(siteSettings)
      .set({
        ...patch,
        updatedAt: new Date()
      })
      .where(eq(siteSettings.id, current.id))
      .returning()

    return updated[0] || current
  }
}
