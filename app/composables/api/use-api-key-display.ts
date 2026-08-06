import type { ApiKeyItem } from '#shared/types/api'

type ApiKeyStatus = 'enabled' | 'disabled' | 'expired'
type ApiKeyStatusColor = 'success' | 'warning' | 'neutral'

const API_KEY_STATUS_COLORS: Record<ApiKeyStatus, ApiKeyStatusColor> = {
  enabled: 'success',
  disabled: 'neutral',
  expired: 'warning'
}

interface ApiKeyStatusMeta {
  code: ApiKeyStatus
  color: ApiKeyStatusColor
  label: string
}

export function useApiKeyDisplay() {
  const { t, locale } = useI18n()

  function getStatusCode(row: ApiKeyItem): ApiKeyStatus {
    if (!row.isActive) return 'disabled'
    if (isApiKeyExpired(row)) return 'expired'
    return 'enabled'
  }

  function getStatus(row: ApiKeyItem): ApiKeyStatusMeta {
    const code = getStatusCode(row)
    return {
      code,
      color: API_KEY_STATUS_COLORS[code],
      label: t(`common.apiKeys.statuses.${code}`)
    }
  }

  function getQuotaText(row: Pick<ApiKeyItem, 'totalQuota' | 'usedCredits'>): string {
    if (row.totalQuota === null || row.totalQuota === undefined) return t('common.apiKeys.display.unlimited')
    const used = Number(row.usedCredits || 0).toLocaleString(locale.value)
    const total = Number(row.totalQuota).toLocaleString(locale.value)
    return `${used} / ${total}`
  }

  function getScopesText(scopes: string[] | null, labelMap?: Map<string, string>): string {
    if (!scopes || scopes.length === 0) return t('common.apiKeys.scopes.all')
    if (scopes.length <= 2) return scopes.map(scope => labelMap?.get(scope) || scope).join(', ')
    return t('common.apiKeys.display.scopeCount', { count: scopes.length.toLocaleString(locale.value) })
  }

  function getIpText(ipWhitelist: string[] | null): string {
    if (!ipWhitelist || ipWhitelist.length === 0) return t('common.apiKeys.display.allIps')
    if (ipWhitelist.length === 1) return ipWhitelist[0]!
    return t('common.apiKeys.display.cidrCount', { count: ipWhitelist.length.toLocaleString(locale.value) })
  }

  return {
    getIpText,
    getQuotaText,
    getScopesText,
    getStatus,
    getStatusCode
  }
}
