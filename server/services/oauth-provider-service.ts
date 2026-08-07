import { SUPPORTED_OAUTH_PROVIDERS, type SupportedOauthProvider } from '#shared/types/oauth'
import type { SystemSettingsPatch } from '#shared/types/site-settings'
import { createApplicationError } from '~~/server/errors/application-error'
import { isSupportedOauthProvider, providerIndex } from '~~/server/utils/oauth-provider-id'
import { systemSettingsService } from '~~/server/services/system-settings-service'

export interface OauthProviderPatch {
  clientId?: string
  clientSecret?: string
  isEnabled?: boolean
}

interface OauthProviderBatchItem {
  provider: SupportedOauthProvider
  clientId: string
  clientSecret?: string
  isEnabled: boolean
}

export interface OauthProviderBatchUpdate {
  oauthForceBinding: boolean
  providers: OauthProviderBatchItem[]
}

// provider 配置视图。数据落在 system_settings 的命名空间键中，敏感值加密存储。
export interface OauthProviderRow {
  provider: SupportedOauthProvider
  clientId: string
  clientSecret: string
  isEnabled: boolean
}

interface AdminOauthProviderSafe {
  provider: SupportedOauthProvider
  clientId: string
  clientSecret: string
  isEnabled: boolean
}

type SystemSettingsSnapshot = Awaited<ReturnType<typeof systemSettingsService.getSettings>>

// provider → 强类型配置名映射，集中一处。扩 provider 时只需注册配置并在此声明映射。
interface ProviderColumns {
  clientId: 'oauthGithubClientId' | 'oauthQqClientId'
  clientSecret: 'oauthGithubClientSecret' | 'oauthQqClientSecret'
  isEnabled: 'oauthGithubEnabled' | 'oauthQqEnabled'
}
const PROVIDER_COLUMNS: Record<SupportedOauthProvider, ProviderColumns> = {
  github: { clientId: 'oauthGithubClientId', clientSecret: 'oauthGithubClientSecret', isEnabled: 'oauthGithubEnabled' },
  qq: { clientId: 'oauthQqClientId', clientSecret: 'oauthQqClientSecret', isEnabled: 'oauthQqEnabled' }
}

function rowFromSettings(settings: SystemSettingsSnapshot, provider: SupportedOauthProvider): OauthProviderRow {
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
    const settings = await systemSettingsService.getSettings()
    return SUPPORTED_OAUTH_PROVIDERS.map(p => rowFromSettings(settings, p))
  },

  /** 已启用的 provider（按各 provider 自己的启用开关；无全局总开关） */
  async listEnabledProviders(): Promise<SupportedOauthProvider[]> {
    const settings = await systemSettingsService.getSettings()
    return SUPPORTED_OAUTH_PROVIDERS.filter(p => settings[PROVIDER_COLUMNS[p].isEnabled])
  },

  async getByProvider(provider: string): Promise<OauthProviderRow | null> {
    if (!isSupportedOauthProvider(provider)) {
      return null
    }
    const settings = await systemSettingsService.getSettings()
    return rowFromSettings(settings, provider)
  },

  async update(provider: string, patch: OauthProviderPatch): Promise<OauthProviderRow | null> {
    if (!isSupportedOauthProvider(provider)) {
      throw createApplicationError({ statusCode: 400, message: 'provider not supported, only github and qq are allowed' })
    }
    const current = await oauthProviderService.getByProvider(provider)
    if (!current) {
      return null // provider 已校验，理论不可达
    }

    const nextClientId = patch.clientId !== undefined ? patch.clientId.trim() : current.clientId
    // 明文：undefined = 不改动；其他值（含空串）直接覆盖
    const nextSecret = patch.clientSecret !== undefined ? patch.clientSecret : current.clientSecret
    const nextEnabled = patch.isEnabled !== undefined ? patch.isEnabled : current.isEnabled

    if (nextEnabled && (!nextClientId || !nextSecret)) {
      throw createApplicationError({ statusCode: 400, message: 'clientId 和 clientSecret 都需要配置后才能启用' })
    }

    const input: SystemSettingsPatch = provider === 'github'
      ? { oauthGithubClientId: nextClientId, oauthGithubClientSecret: nextSecret, oauthGithubEnabled: nextEnabled }
      : { oauthQqClientId: nextClientId, oauthQqClientSecret: nextSecret, oauthQqEnabled: nextEnabled }
    await systemSettingsService.update(input)

    return { provider, clientId: nextClientId, clientSecret: nextSecret, isEnabled: nextEnabled }
  },

  /** 将绑定策略和全部 provider 配置作为一次数据库更新提交，避免部分保存成功。 */
  async updateAll(batch: OauthProviderBatchUpdate): Promise<OauthProviderRow[]> {
    const currentSettings = await systemSettingsService.getSettings()
    const input: SystemSettingsPatch = { oauthForceBinding: batch.oauthForceBinding }
    const rows: OauthProviderRow[] = []

    for (const provider of SUPPORTED_OAUTH_PROVIDERS) {
      const submitted = batch.providers.find(item => item.provider === provider)
      if (!submitted) {
        throw createApplicationError({ statusCode: 400, message: `缺少 ${provider} 登录配置` })
      }

      const current = rowFromSettings(currentSettings, provider)
      const clientId = submitted.clientId.trim()
      const clientSecret = submitted.clientSecret !== undefined
        ? submitted.clientSecret
        : current.clientSecret

      if (submitted.isEnabled && (!clientId || !clientSecret)) {
        throw createApplicationError({
          statusCode: 400,
          message: `${provider} 的 Client ID 和 Client Secret 都配置后才能启用`
        })
      }

      const columns = PROVIDER_COLUMNS[provider]
      input[columns.clientId] = clientId
      input[columns.clientSecret] = clientSecret
      input[columns.isEnabled] = submitted.isEnabled
      rows.push({ provider, clientId, clientSecret, isEnabled: submitted.isEnabled })
    }

    await systemSettingsService.update(input)
    return rows
  }
}
