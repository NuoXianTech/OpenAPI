import type {
  PublicSiteSettings,
  PublicTurnstileSettings,
  SystemSettings,
  SystemSettingsPatch
} from '#shared/types/site-settings'
import { createError } from 'h3'
import {
  SYSTEM_SETTING_DEFINITIONS,
  SYSTEM_SETTING_NAMES,
  createSystemSettingsDefaults,
  type SystemSettingName
} from '~~/server/config/system-settings'
import { db } from '~~/server/db/client'
import { systemSettings } from '~~/server/db/schema/system'
import { deleteSharedCache, getSharedCache } from '~~/server/utils/shared-cache'
import {
  decodeSystemSettingSecret,
  encodeSystemSettingSecret
} from '~~/server/utils/system-setting-secret'

const PUBLIC_SYSTEM_SETTINGS_CACHE_KEY = 'cache:public:settings'
const PUBLIC_SYSTEM_SETTINGS_TTL_SECONDS = 30
const SYSTEM_SETTINGS_CACHE_TTL_MS = 10_000

export type { PublicSiteSettings, PublicTurnstileSettings, SystemSettings, SystemSettingsPatch }

type SystemSettingRow = typeof systemSettings.$inferSelect
type SystemSettingInsert = typeof systemSettings.$inferInsert

const SECRET_SETTING_NAMES = SYSTEM_SETTING_NAMES.filter(name => SYSTEM_SETTING_DEFINITIONS[name].secret)
const NON_SECRET_SETTING_NAMES = SYSTEM_SETTING_NAMES.filter(name => !SYSTEM_SETTING_DEFINITIONS[name].secret)

interface AdminSystemSettingsSecrets {
  hasSmtpPass: boolean
  hasOauthGithubClientSecret: boolean
  hasOauthQqClientSecret: boolean
  hasTurnstileSecretKey: boolean
}

export type AdminSystemSettings = Omit<
  SystemSettings,
  'smtpPass' | 'oauthGithubClientSecret' | 'oauthQqClientSecret' | 'turnstileSecretKey'
> & {
  secrets: AdminSystemSettingsSecrets
}

function encodeValue<TName extends SystemSettingName>(
  name: TName,
  input: SystemSettings[TName]
): unknown {
  const definition = SYSTEM_SETTING_DEFINITIONS[name]
  const value = definition.schema.parse(input)
  if (!definition.secret) return value
  if (typeof value !== 'string') {
    throw new Error(`secret system setting ${definition.key} must be a string`)
  }
  return encodeSystemSettingSecret(value)
}

function decodeValue<TName extends SystemSettingName>(
  name: TName,
  row: SystemSettingRow
): SystemSettings[TName] {
  const definition = SYSTEM_SETTING_DEFINITIONS[name]
  let value = row.value

  if (definition.secret) {
    if (!row.isSecret || typeof value !== 'string') {
      throw new Error(`系统敏感配置 ${definition.key} 的存储格式不正确`)
    }
    value = decodeSystemSettingSecret(value)
  } else if (row.isSecret) {
    throw new Error(`系统配置 ${definition.key} 的敏感标记与注册表不一致`)
  }

  const parsed = definition.schema.safeParse(value)
  if (!parsed.success) {
    throw new Error(`系统配置 ${definition.key} 的值不合法：${parsed.error.issues[0]?.message || 'unknown error'}`)
  }
  return parsed.data as SystemSettings[TName]
}

function createInsert<TName extends SystemSettingName>(
  name: TName,
  value: SystemSettings[TName]
): SystemSettingInsert {
  const definition = SYSTEM_SETTING_DEFINITIONS[name]
  return {
    settingKey: definition.key,
    value: encodeValue(name, value),
    isSecret: definition.secret,
    description: definition.description
  }
}

async function insertMissingDefaults(rows: SystemSettingInsert[]): Promise<void> {
  if (rows.length === 0) return
  await db.insert(systemSettings).values(rows).onConflictDoNothing()
}

async function loadSettingsFromDatabase(): Promise<SystemSettings> {
  const rows = await db.select().from(systemSettings)
  const rowsByKey = new Map(rows.map(row => [row.settingKey, row]))
  const values = createSystemSettingsDefaults()
  const missingRows: SystemSettingInsert[] = []

  for (const name of SYSTEM_SETTING_NAMES) {
    const definition = SYSTEM_SETTING_DEFINITIONS[name]
    const row = rowsByKey.get(definition.key)
    if (!row) {
      missingRows.push(createInsert(name, values[name]))
      continue
    }
    values[name] = decodeValue(name, row) as never
  }

  await insertMissingDefaults(missingRows)
  return values
}

let settingsCache: { value: SystemSettings, expiresAt: number } | null = null

function cacheSettings(value: SystemSettings): SystemSettings {
  settingsCache = { value, expiresAt: Date.now() + SYSTEM_SETTINGS_CACHE_TTL_MS }
  return value
}

function assertClientIpSettings(settings: SystemSettings): void {
  if (settings.clientIpSource === 'direct') return
  if (settings.trustedProxyCidrs.trim()) return

  throw createError({
    statusCode: 400,
    message: 'Cloudflare 或 X-Forwarded-For 模式必须至少配置一个可信代理 IP 或 CIDR'
  })
}

function updatesClientIpSettings(patch: SystemSettingsPatch): boolean {
  return patch.clientIpSource !== undefined
    || patch.trustedProxyCidrs !== undefined
    || patch.clientIpForwardedHops !== undefined
}

function toPublicTurnstile(settings: SystemSettings): PublicTurnstileSettings {
  const enabled = Boolean(settings.turnstileSiteKey) && Boolean(settings.turnstileSecretKey)
  return {
    enabled,
    siteKey: enabled ? settings.turnstileSiteKey : '',
    login: enabled && settings.turnstileLoginEnabled,
    register: enabled && settings.turnstileRegisterEnabled,
    passwordReset: enabled && settings.turnstilePasswordResetEnabled,
    checkin: enabled && settings.turnstileCheckinEnabled
  }
}

export function toAdminSystemSettings(settings: SystemSettings): AdminSystemSettings {
  const safe = Object.fromEntries(
    NON_SECRET_SETTING_NAMES.map(name => [name, settings[name]])
  ) as Omit<AdminSystemSettings, 'secrets'>

  return {
    ...safe,
    secrets: {
      hasSmtpPass: settings.smtpPass.length > 0,
      hasOauthGithubClientSecret: settings.oauthGithubClientSecret.length > 0,
      hasOauthQqClientSecret: settings.oauthQqClientSecret.length > 0,
      hasTurnstileSecretKey: settings.turnstileSecretKey.length > 0
    }
  }
}

async function upsertSettings(patch: SystemSettingsPatch): Promise<void> {
  const names = Object.keys(patch) as SystemSettingName[]
  if (names.length === 0) return

  await db.transaction(async (tx) => {
    for (const name of names) {
      const value = patch[name]
      if (value === undefined) continue
      const row = createInsert(name, value as never)
      await tx.insert(systemSettings).values(row).onConflictDoUpdate({
        target: systemSettings.settingKey,
        set: {
          value: row.value,
          isSecret: row.isSecret,
          description: row.description,
          updatedAt: new Date()
        }
      })
    }
  })
}

export const systemSettingsService = {
  async getSettings(): Promise<SystemSettings> {
    if (settingsCache && settingsCache.expiresAt > Date.now()) {
      return settingsCache.value
    }
    return cacheSettings(await loadSettingsFromDatabase())
  },

  async get<TName extends SystemSettingName>(name: TName): Promise<SystemSettings[TName]> {
    return (await this.getSettings())[name]
  },

  async getPublicSettings(): Promise<PublicSiteSettings> {
    return getSharedCache<PublicSiteSettings>({
      key: PUBLIC_SYSTEM_SETTINGS_CACHE_KEY,
      ttlSeconds: PUBLIC_SYSTEM_SETTINGS_TTL_SECONDS,
      async loader() {
        return systemSettingsService.toPublicSettings(await systemSettingsService.getSettings())
      }
    })
  },

  toPublicSettings(settings: SystemSettings): PublicSiteSettings {
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

  async getForAdmin(): Promise<AdminSystemSettings> {
    return toAdminSystemSettings(await this.getSettings())
  },

  async update(input: SystemSettingsPatch): Promise<SystemSettings> {
    const current = await this.getSettings()
    const normalizedPatch: SystemSettingsPatch = {}

    for (const name of Object.keys(input) as SystemSettingName[]) {
      const value = input[name]
      if (value === undefined) continue
      normalizedPatch[name] = SYSTEM_SETTING_DEFINITIONS[name].schema.parse(value) as never
    }

    const next = { ...current, ...normalizedPatch }
    if (updatesClientIpSettings(normalizedPatch)) assertClientIpSettings(next)
    const turnstileSceneEnabled = next.turnstileLoginEnabled
      || next.turnstileRegisterEnabled
      || next.turnstilePasswordResetEnabled
      || next.turnstileCheckinEnabled
    if (turnstileSceneEnabled && (!next.turnstileSiteKey || !next.turnstileSecretKey)) {
      throw createError({
        statusCode: 400,
        message: '启用 Turnstile 场景前必须同时配置 Site Key 和 Secret Key'
      })
    }
    await upsertSettings(normalizedPatch)
    cacheSettings(next)
    await deleteSharedCache([PUBLIC_SYSTEM_SETTINGS_CACHE_KEY])
    return next
  },

  registeredKeys(): readonly string[] {
    return SYSTEM_SETTING_NAMES.map(name => SYSTEM_SETTING_DEFINITIONS[name].key)
  },

  secretNames(): readonly SystemSettingName[] {
    return SECRET_SETTING_NAMES
  }
}
