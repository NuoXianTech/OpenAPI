import { getSharedCache } from '~~/server/utils/shared-cache'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

const MOJANG_PROFILE_HOST = 'api.mojang.com'
const MOJANG_SESSION_HOST = 'sessionserver.mojang.com'
const MINECRAFT_TEXTURE_HOST = 'textures.minecraft.net'
const MINECRAFT_PROFILE_CACHE_TTL_SECONDS = 5 * 60
const MAX_RESPONSE_BYTES = 64 * 1024
const MAX_TEXTURE_PROPERTY_LENGTH = 64 * 1024
const USERNAME_PATTERN = /^[a-z0-9_]{3,16}$/i
const COMPACT_UUID_PATTERN = /^[a-f0-9]{32}$/i
const DASHED_UUID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i

type UnknownRecord = Record<string, unknown>
type MinecraftErrorKind = 'input' | 'business' | 'upstream'

export type MinecraftOutputType = 'json' | 'skin' | 'cape'

export interface MinecraftTexture {
  url: string
}

export interface MinecraftSkin extends MinecraftTexture {
  model: 'classic' | 'slim'
}

export interface MinecraftProfileData {
  name: string
  uuid: string
  texture_timestamp: number
  skin: MinecraftSkin | null
  cape: MinecraftTexture | null
}

export interface MinecraftFailure {
  status: number
  code: string
  message: string
  biz: boolean
}

class MinecraftError extends Error {
  constructor(
    readonly kind: MinecraftErrorKind,
    readonly status: number,
    readonly code: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
  }
}

function createError(
  kind: MinecraftErrorKind,
  status: number,
  code: string,
  message: string,
  options?: ErrorOptions
): MinecraftError {
  return new MinecraftError(kind, status, code, message, options)
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeUuid(value: unknown): string | null {
  const uuid = readString(value).replaceAll('-', '').toLowerCase()
  return COMPACT_UUID_PATTERN.test(uuid) ? uuid : null
}

export function normalizeMinecraftIdentifier(value: string): string | null {
  const identifier = value.trim()
  if (USERNAME_PATTERN.test(identifier)) return identifier
  if (COMPACT_UUID_PATTERN.test(identifier) || DASHED_UUID_PATTERN.test(identifier)) {
    return identifier.replaceAll('-', '').toLowerCase()
  }
  return null
}

export function parseMinecraftOutputType(value: string): MinecraftOutputType | null {
  const type = value.trim().toLowerCase()
  if (!type || type === 'json') return 'json'
  if (type === 'skin' || type === 'skin_url') return 'skin'
  if (type === 'cape' || type === 'skin_cloak') return 'cape'
  return null
}

function normalizeTextureUrl(value: unknown): string | null {
  const rawUrl = readString(value)
  if (!rawUrl) return null

  try {
    const url = new URL(rawUrl)
    if (
      !['http:', 'https:'].includes(url.protocol)
      || url.hostname !== MINECRAFT_TEXTURE_HOST
      || url.username
      || url.password
      || url.port
    ) {
      throw new Error('unsafe texture URL')
    }
    url.protocol = 'https:'
    return url.toString()
  } catch (error) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang 返回了无效的纹理地址', { cause: error })
  }
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', `${source} 返回了无效 JSON`, { cause: error })
  }
}

async function fetchJson(
  url: URL,
  allowedHost: string,
  source: string,
  signal?: AbortSignal
): Promise<{ status: number, payload: unknown }> {
  let response: Response
  try {
    response = await safeFetch(url, {
      allowedHosts: [allowedHost],
      headers: {
        'accept': 'application/json',
        'user-agent': 'OpenAPI/Minecraft'
      },
      signal: signal ?? AbortSignal.timeout(10_000)
    })
  } catch (error) {
    throw createError('upstream', 502, 'UPSTREAM_ERROR', `请求 ${source} 失败`, { cause: error })
  }

  const text = await readLimitedText(response, MAX_RESPONSE_BYTES)
    .catch((error) => {
      throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', `${source} 返回内容无效或过大`, { cause: error })
    })
  return {
    status: response.status,
    payload: response.ok && text ? parseJson(text, source) : null
  }
}

async function resolveUuid(username: string, signal?: AbortSignal): Promise<string> {
  const url = new URL(`https://${MOJANG_PROFILE_HOST}/users/profiles/minecraft/${encodeURIComponent(username)}`)
  const { status, payload } = await fetchJson(url, MOJANG_PROFILE_HOST, 'Mojang Profile API', signal)
  if (status === 204 || status === 404) {
    throw createError('business', 404, 'PLAYER_NOT_FOUND', '未找到该 Minecraft Java 版玩家')
  }
  if (status < 200 || status >= 300) {
    throw createError('upstream', 502, 'UPSTREAM_ERROR', `Mojang Profile API 返回 HTTP ${status}`)
  }

  const uuid = isRecord(payload) ? normalizeUuid(payload.id) : null
  if (!uuid) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang Profile API 返回了无效玩家资料')
  }
  return uuid
}

function decodeTextureProperty(value: string): UnknownRecord {
  if (!value || value.length > MAX_TEXTURE_PROPERTY_LENGTH) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang 返回了无效纹理属性')
  }

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8')
    const payload = JSON.parse(decoded) as unknown
    if (!isRecord(payload)) throw new Error('invalid texture payload')
    return payload
  } catch (error) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang 返回了无效纹理属性', { cause: error })
  }
}

function normalizeSessionProfile(payload: unknown, expectedUuid: string): MinecraftProfileData {
  if (!isRecord(payload) || !Array.isArray(payload.properties)) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang Session Server 返回了无效玩家资料')
  }

  const uuid = normalizeUuid(payload.id)
  const name = readString(payload.name)
  const textureProperty = payload.properties.find((property) => {
    return isRecord(property) && property.name === 'textures' && typeof property.value === 'string'
  })
  if (!uuid || uuid !== expectedUuid || !USERNAME_PATTERN.test(name) || !isRecord(textureProperty)) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang Session Server 返回了无效玩家资料')
  }

  const texturePayload = decodeTextureProperty(readString(textureProperty.value))
  const timestamp = Number(texturePayload.timestamp)
  const textures = texturePayload.textures
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || !isRecord(textures)) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', 'Mojang 返回了无效纹理数据')
  }

  const skinPayload = isRecord(textures.SKIN) ? textures.SKIN : null
  const capePayload = isRecord(textures.CAPE) ? textures.CAPE : null
  const skinUrl = skinPayload ? normalizeTextureUrl(skinPayload.url) : null
  const capeUrl = capePayload ? normalizeTextureUrl(capePayload.url) : null
  const skinMetadata = skinPayload && isRecord(skinPayload.metadata) ? skinPayload.metadata : null

  return {
    name,
    uuid,
    texture_timestamp: timestamp,
    skin: skinUrl
      ? { url: skinUrl, model: skinMetadata?.model === 'slim' ? 'slim' : 'classic' }
      : null,
    cape: capeUrl ? { url: capeUrl } : null
  }
}

async function fetchMinecraftProfile(identifier: string, signal?: AbortSignal): Promise<MinecraftProfileData> {
  const uuid = COMPACT_UUID_PATTERN.test(identifier)
    ? identifier.toLowerCase()
    : await resolveUuid(identifier, signal)
  const url = new URL(`https://${MOJANG_SESSION_HOST}/session/minecraft/profile/${uuid}`)
  url.searchParams.set('unsigned', 'true')

  const { status, payload } = await fetchJson(url, MOJANG_SESSION_HOST, 'Mojang Session Server', signal)
  if (status === 204 || status === 404) {
    throw createError('business', 404, 'PLAYER_NOT_FOUND', '未找到该 Minecraft Java 版玩家')
  }
  if (status < 200 || status >= 300) {
    throw createError('upstream', 502, 'UPSTREAM_ERROR', `Mojang Session Server 返回 HTTP ${status}`)
  }
  return normalizeSessionProfile(payload, uuid)
}

export function getMinecraftProfile(identifier: string, signal?: AbortSignal): Promise<MinecraftProfileData> {
  return getSharedCache({
    key: `cache:minecraft:profile:${identifier.toLowerCase()}`,
    ttlSeconds: MINECRAFT_PROFILE_CACHE_TTL_SECONDS,
    signal,
    loader: () => fetchMinecraftProfile(identifier, signal)
  })
}

export function classifyMinecraftError(error: unknown): MinecraftFailure {
  if (error instanceof MinecraftError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      biz: error.kind !== 'input'
    }
  }
  return { status: 502, code: 'UPSTREAM_ERROR', message: '获取 Minecraft 玩家资料失败', biz: true }
}

export function createMinecraftInputError(code: 'MISSING_ID' | 'INVALID_ID' | 'INVALID_TYPE'): Error {
  const messages = {
    MISSING_ID: '缺少参数 id',
    INVALID_ID: 'id 必须是 Minecraft Java 版用户名或 UUID',
    INVALID_TYPE: 'type 仅支持 json、skin 或 cape'
  } as const
  return createError('input', 400, code, messages[code])
}
