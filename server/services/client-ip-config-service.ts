import type { EffectiveClientIpConfig } from '#shared/types/client-ip'
import type { SystemSettings } from '#shared/types/site-settings'
import { parseTrustedProxyCidrs } from '#shared/utils/proxy-cidrs'
import {
  parseRuntimeClientIpConfig,
  type RuntimeProxyConfigInput
} from '~~/server/config/client-ip'
import { systemSettingsService } from '~~/server/services/system-settings-service'

const DATABASE_CONFIG_TTL_MS = 5_000

function directDatabaseConfig(safeFallback = false): EffectiveClientIpConfig {
  return {
    source: 'direct',
    trustedProxyCidrs: [],
    forwardedHops: 1,
    managedBy: 'database',
    safeFallback
  }
}

function fromSystemSettings(settings: SystemSettings): EffectiveClientIpConfig {
  if (settings.clientIpSource === 'direct') return directDatabaseConfig()

  const parsed = parseTrustedProxyCidrs(settings.trustedProxyCidrs)
  if (parsed.invalidEntries.length > 0 || parsed.cidrs.length === 0) {
    return directDatabaseConfig(true)
  }

  return {
    source: settings.clientIpSource,
    trustedProxyCidrs: parsed.cidrs,
    forwardedHops: settings.clientIpSource === 'x_forwarded_for'
      ? settings.clientIpForwardedHops
      : 1,
    managedBy: 'database',
    safeFallback: false
  }
}

let environmentConfig: EffectiveClientIpConfig | null = null
let databaseSnapshot: { value: EffectiveClientIpConfig, expiresAt: number } | null = null
let pendingDatabaseLoad: Promise<EffectiveClientIpConfig> | null = null
let loggedDatabaseFailure = false

async function loadDatabaseConfig(): Promise<EffectiveClientIpConfig> {
  try {
    const value = fromSystemSettings(await systemSettingsService.getSettings())
    databaseSnapshot = { value, expiresAt: Date.now() + DATABASE_CONFIG_TTL_MS }
    loggedDatabaseFailure = false
    return value
  } catch (error) {
    if (!loggedDatabaseFailure) {
      loggedDatabaseFailure = true
      console.warn('[client-ip] Failed to refresh database configuration; using safe fallback', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
    const value = databaseSnapshot?.value ?? directDatabaseConfig(true)
    // 数据库异常时短暂缓存旧值或安全回退，避免请求钩子在每个请求上重复访问故障数据库。
    databaseSnapshot = { value, expiresAt: Date.now() + DATABASE_CONFIG_TTL_MS }
    return value
  }
}

export const clientIpConfigService = {
  configureEnvironment(input: RuntimeProxyConfigInput): void {
    environmentConfig = parseRuntimeClientIpConfig(input)
  },

  async getEffectiveConfig(): Promise<EffectiveClientIpConfig> {
    if (environmentConfig) return environmentConfig
    if (databaseSnapshot && databaseSnapshot.expiresAt > Date.now()) {
      return databaseSnapshot.value
    }
    if (pendingDatabaseLoad) return pendingDatabaseLoad

    pendingDatabaseLoad = loadDatabaseConfig()
    try {
      return await pendingDatabaseLoad
    } finally {
      pendingDatabaseLoad = null
    }
  },

  refreshFromSettings(settings: SystemSettings): void {
    databaseSnapshot = {
      value: fromSystemSettings(settings),
      expiresAt: Date.now() + DATABASE_CONFIG_TTL_MS
    }
    loggedDatabaseFailure = false
  }
}
