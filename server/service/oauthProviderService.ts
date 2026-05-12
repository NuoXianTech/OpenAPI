import { asc, eq } from 'drizzle-orm'
import { createError } from 'h3'
import { oauthProviders } from '@nuxthub/db/schema'
import { encryptSecret, isSecretMask, maskSecret } from '~~/server/utils/oauthCrypto'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { isSupportedOauthProvider, providerIndex, SUPPORTED_OAUTH_PROVIDERS, type SupportedOauthProvider } from '~~/shared/types/oauth'

export interface OauthProviderPatch {
  clientId?: string
  clientSecret?: string
  isEnabled?: boolean
}

type ProviderRow = typeof oauthProviders.$inferSelect
export type OauthProviderRow = ProviderRow

function maskRow(row: ProviderRow): ProviderRow {
  return { ...row, clientSecret: maskSecret(row.clientSecret) }
}

export function buildCallbackUrl(siteUrl: string, provider: string) {
  const base = siteUrl.replace(/\/+$/, '') || 'http://localhost:3000'
  if (!isSupportedOauthProvider(provider)) {
    // 仅支持白名单 provider；未识别时返回一个无效但显式的占位，
    // 调用方会在 oauthProviderService.update 等处校验并抛错，不会真把它发给第三方平台
    return `${base}/callback/openid/-1`
  }
  return `${base}/callback/openid/${providerIndex(provider)}`
}

async function ensureRow(provider: SupportedOauthProvider): Promise<ProviderRow> {
  const existing = await db.select().from(oauthProviders).where(eq(oauthProviders.provider, provider)).limit(1)
  if (existing[0]) {
    return existing[0]
  }
  const inserted = await db.insert(oauthProviders).values({
    provider,
    clientId: '',
    clientSecret: '',
    isEnabled: false
  }).returning()
  return inserted[0]!
}

export const oauthProviderService = {
  async list(): Promise<ProviderRow[]> {
    for (const p of SUPPORTED_OAUTH_PROVIDERS) {
      await ensureRow(p)
    }
    const rows: ProviderRow[] = await db.select().from(oauthProviders).orderBy(asc(oauthProviders.id))
    return rows
      .filter((row: ProviderRow) => isSupportedOauthProvider(row.provider))
      .map(maskRow)
  },

  async listEnabledProviders(): Promise<SupportedOauthProvider[]> {
    const rows: Array<{ provider: string }> = await db.select({ provider: oauthProviders.provider })
      .from(oauthProviders)
      .where(eq(oauthProviders.isEnabled, true))
    return rows
      .map(r => r.provider)
      .filter(isSupportedOauthProvider)
  },

  async getByProvider(provider: string) {
    if (!isSupportedOauthProvider(provider)) {
      return null
    }
    const res = await db.select().from(oauthProviders).where(eq(oauthProviders.provider, provider)).limit(1)
    return res[0] || null
  },

  async update(provider: string, patch: OauthProviderPatch) {
    if (!isSupportedOauthProvider(provider)) {
      throw createError({ statusCode: 400, message: 'provider not supported, only github and qq are allowed' })
    }
    const current = await ensureRow(provider)

    const next: Partial<ProviderRow> = { updatedAt: new Date() }
    if (patch.clientId !== undefined) next.clientId = patch.clientId.trim()
    if (patch.clientSecret !== undefined && !isSecretMask(patch.clientSecret)) {
      next.clientSecret = encryptSecret(patch.clientSecret)
    }
    if (patch.isEnabled !== undefined) next.isEnabled = patch.isEnabled

    if (patch.isEnabled === true) {
      const effectiveClientId = next.clientId ?? current.clientId
      const effectiveSecret = next.clientSecret ?? current.clientSecret
      if (!effectiveClientId || !effectiveSecret) {
        throw createError({ statusCode: 400, message: 'clientId 和 clientSecret 都需要配置后才能启用' })
      }
    }

    const res = await db.update(oauthProviders).set(next).where(eq(oauthProviders.id, current.id)).returning()
    return res[0] ? maskRow(res[0]) : null
  },

  async getSiteCallbackUrl(provider: string) {
    const settings = await siteSettingsService.getOrCreate()
    return buildCallbackUrl(settings.siteUrl, provider)
  }
}
