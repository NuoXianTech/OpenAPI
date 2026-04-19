import { eq } from 'drizzle-orm'
import { siteSettings } from '~~/server/db/schema/system'

const DEFAULT_SCOPE = 'default'

export interface PublicSiteSettings {
  siteUrl: string
  siteImg: string
  siteName: string
  siteDescription: string
  startTime: string
  icpBeian: string | null
  policeBeian: string | null
  termsUrl: string | null
  privacyUrl: string | null
  registrationMode: string
  oauthLoginEnabled: boolean
}

export interface SiteSettingsUpsertInput {
  siteUrl?: string
  siteImg?: string
  siteName?: string
  siteDescription?: string
  startTime?: string
  sessionMaxAgeSeconds?: number
  emailVerifyExpiresInMinutes?: number
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  smtpUser?: string
  smtpPass?: string
  smtpFrom?: string
  oauthLoginEnabled?: boolean
  oauthForceBinding?: boolean
}

function buildInitialDefaults() {
  return {
    scope: DEFAULT_SCOPE,
    siteUrl: 'http://localhost:3000',
    siteImg: 'https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640',
    siteName: 'OpenAPI',
    siteDescription: 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
    startTime: '2026-01-01 00:00:00',
    sessionMaxAgeSeconds: 60 * 60 * 24 * 7,
    emailVerifyExpiresInMinutes: 30,
    smtpHost: 'smtp.example.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'no-reply@example.com',
  }
}

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
    }
    catch {
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
    }
  },

  async update(input: SiteSettingsUpsertInput) {
    const current = await this.getOrCreate()

    const updated = await db.update(siteSettings)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(siteSettings.id, current.id))
      .returning()

    return updated[0] || current
  },
}
