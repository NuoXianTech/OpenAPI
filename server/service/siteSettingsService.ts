import { eq } from 'drizzle-orm'
import { siteSettings } from '~~/server/db/schema/siteSettings'

const DEFAULT_SCOPE = 'default'

export interface PublicSiteSettings {
  siteUrl: string
  siteImg: string
  siteName: string
  siteDescription: string
  startTime: string
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
}

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }
  return value === 'true'
}

function toDefaultsFromEnv() {
  return {
    scope: DEFAULT_SCOPE,
    siteUrl: process.env.SITE_URL || 'http://localhost:3000',
    siteImg: process.env.SITE_IMG || 'https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640',
    siteName: process.env.SITE_NAME || 'OpenAPI',
    siteDescription:
      process.env.SITE_DESCRIPTION
      || 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。',
    startTime: process.env.START_TIME || '2026-01-01 00:00:00',
    sessionMaxAgeSeconds: parseInteger(process.env.SESSION_MAX_AGE, 60 * 60 * 24 * 7),
    emailVerifyExpiresInMinutes: parseInteger(process.env.EMAIL_VERIFY_EXPIRES_IN, 30),
    smtpHost: process.env.SMTP_HOST || 'smtp.example.com',
    smtpPort: parseInteger(process.env.SMTP_PORT, 465),
    smtpSecure: parseBoolean(process.env.SMTP_SECURE, true),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || 'no-reply@example.com',
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

    const defaults = toDefaultsFromEnv()

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
