import { createError } from 'h3'
import {
  isSupportedOauthProvider,
  providerIndex,
  SUPPORTED_OAUTH_PROVIDERS,
  type SupportedOauthProvider
} from '~~/shared/types/oauth'
import { siteSettingsService, type SiteSettingsUpsertInput } from '~~/server/service/siteSettingsService'

export interface OauthProviderPatch {
  clientId?: string
  clientSecret?: string
  isEnabled?: boolean
}

// provider 配置视图。数据实际落在 siteSettings 的扁平列里（明文），此处合成成统一形状，
// 让 oauthCallback / start / admin 端点无需感知存储细节（曾是独立的 oauth_providers 表）。
export interface OauthProviderRow {
  provider: SupportedOauthProvider
  clientId: string
  clientSecret: string
  isEnabled: boolean
}

export interface AdminOauthProviderSafe {
  provider: SupportedOauthProvider
  clientId: string
  clientSecret: string
  isEnabled: boolean
}

type SiteSettingsRow = Awaited<ReturnType<typeof siteSettingsService.getOrCreate>>

// provider → siteSettings 列名映射，集中一处。
// 扩 provider 时：① schema/system.ts 加 3 列 ② 此表加一行 ③ SiteSettingsUpsertInput 加字段。
interface ProviderColumns {
  clientId: 'oauthGithubClientId' | 'oauthQqClientId'
  clientSecret: 'oauthGithubClientSecret' | 'oauthQqClientSecret'
  isEnabled: 'oauthGithubEnabled' | 'oauthQqEnabled'
}
const PROVIDER_COLUMNS: Record<SupportedOauthProvider, ProviderColumns> = {
  github: { clientId: 'oauthGithubClientId', clientSecret: 'oauthGithubClientSecret', isEnabled: 'oauthGithubEnabled' },
  qq: { clientId: 'oauthQqClientId', clientSecret: 'oauthQqClientSecret', isEnabled: 'oauthQqEnabled' }
}

function rowFromSettings(settings: SiteSettingsRow, provider: SupportedOauthProvider): OauthProviderRow {
  const cols = PROVIDER_COLUMNS[provider]
  return {
    provider,
    clientId: settings[cols.clientId],
    clientSecret: settings[cols.clientSecret],
    isEnabled: settings[cols.isEnabled]
  }
}

export function toAdminOauthProviderSafe(row: OauthProviderRow): AdminOauthProviderSafe {
  return {
    provider: row.provider,
    clientId: row.clientId,
    clientSecret: row.clientSecret ? '***' : '',
    isEnabled: row.isEnabled
  }
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

export const oauthProviderService = {
  /** 列出全部受支持 provider 的配置（github / qq，固定两条），admin 列表用 */
  async list(): Promise<OauthProviderRow[]> {
    const settings = await siteSettingsService.getOrCreate()
    return SUPPORTED_OAUTH_PROVIDERS.map(p => rowFromSettings(settings, p))
  },

  /** 已启用的 provider（按各 provider 自己的启用开关；无全局总开关） */
  async listEnabledProviders(): Promise<SupportedOauthProvider[]> {
    const settings = await siteSettingsService.getOrCreate()
    return SUPPORTED_OAUTH_PROVIDERS.filter(p => settings[PROVIDER_COLUMNS[p].isEnabled])
  },

  async getByProvider(provider: string): Promise<OauthProviderRow | null> {
    if (!isSupportedOauthProvider(provider)) {
      return null
    }
    const settings = await siteSettingsService.getOrCreate()
    return rowFromSettings(settings, provider)
  },

  async update(provider: string, patch: OauthProviderPatch): Promise<OauthProviderRow | null> {
    if (!isSupportedOauthProvider(provider)) {
      throw createError({ statusCode: 400, message: 'provider not supported, only github and qq are allowed' })
    }
    const current = await this.getByProvider(provider)
    if (!current) {
      return null // provider 已校验，理论不可达
    }

    const nextClientId = patch.clientId !== undefined ? patch.clientId.trim() : current.clientId
    // 明文：undefined = 不改动；其他值（含空串）直接覆盖
    const nextSecret = patch.clientSecret !== undefined ? patch.clientSecret : current.clientSecret
    const nextEnabled = patch.isEnabled !== undefined ? patch.isEnabled : current.isEnabled

    if (nextEnabled && (!nextClientId || !nextSecret)) {
      throw createError({ statusCode: 400, message: 'clientId 和 clientSecret 都需要配置后才能启用' })
    }

    const input: SiteSettingsUpsertInput = provider === 'github'
      ? { oauthGithubClientId: nextClientId, oauthGithubClientSecret: nextSecret, oauthGithubEnabled: nextEnabled }
      : { oauthQqClientId: nextClientId, oauthQqClientSecret: nextSecret, oauthQqEnabled: nextEnabled }
    await siteSettingsService.update(input)

    return { provider, clientId: nextClientId, clientSecret: nextSecret, isEnabled: nextEnabled }
  },

  async getSiteCallbackUrl(provider: string) {
    const settings = await siteSettingsService.getOrCreate()
    return buildCallbackUrl(settings.siteUrl, provider)
  }
}
