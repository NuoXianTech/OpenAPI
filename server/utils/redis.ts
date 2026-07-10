import Redis from 'ioredis'

interface RedisRuntimeConfig {
  url?: unknown
  keyPrefix?: unknown
  connectTimeoutMs?: unknown
  required?: unknown
}

export interface RedisConfig {
  url: string
  keyPrefix: string
  connectTimeoutMs: number
  required: boolean
}

let redisClient: Redis | null = null
let redisClientUrl = ''
let redisInitialization: Promise<Redis | null> | null = null

function normalizeBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === '1'
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeKeyPrefix(value: unknown): string {
  const prefix = String(value ?? '').trim() || 'openapi:'
  return prefix.endsWith(':') ? prefix : `${prefix}:`
}

export function getRedisConfig(): RedisConfig {
  const runtimeConfig = useRuntimeConfig()
  const redis = runtimeConfig.redis as RedisRuntimeConfig

  return {
    url: String(redis?.url ?? '').trim(),
    keyPrefix: normalizeKeyPrefix(redis?.keyPrefix),
    connectTimeoutMs: normalizePositiveInteger(redis?.connectTimeoutMs, 2_000),
    required: normalizeBoolean(redis?.required)
  }
}

export function createRedisUnavailableError(message: string, cause?: unknown): Error & {
  code: 'REDIS_UNAVAILABLE'
  statusCode: 503
} {
  return Object.assign(new Error(message, cause === undefined ? undefined : { cause }), {
    name: 'RedisUnavailableError',
    code: 'REDIS_UNAVAILABLE' as const,
    statusCode: 503 as const
  })
}

export function isRedisUnavailableError(error: unknown): error is Error & {
  code: 'REDIS_UNAVAILABLE'
  statusCode: 503
} {
  return error instanceof Error
    && (error as { code?: unknown }).code === 'REDIS_UNAVAILABLE'
}

export function getRedisClient(): Redis | null {
  const config = getRedisConfig()
  if (!config.url) {
    if (config.required) {
      throw createRedisUnavailableError('NUXT_REDIS_URL is required when NUXT_REDIS_REQUIRED=true')
    }
    return null
  }

  if (redisClient && redisClientUrl === config.url) return redisClient

  redisClient?.disconnect()
  redisInitialization = null
  redisClientUrl = config.url
  redisClient = new Redis(config.url, {
    lazyConnect: true,
    connectTimeout: config.connectTimeoutMs,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy(attempt) {
      return Math.min(attempt * 200, 2_000)
    }
  })
  redisClient.on('error', () => {
    // 命令调用方负责记录带业务上下文的错误，避免连接层重复刷日志。
  })

  return redisClient
}

export async function initializeRedis(): Promise<Redis | null> {
  const client = getRedisClient()
  if (!client) {
    redisInitialization = null
    return null
  }

  if (redisInitialization) return redisInitialization

  const initialization = (async () => {
    try {
      if (client.status === 'wait') await client.connect()
      await client.ping()
      return client
    } catch (error) {
      throw createRedisUnavailableError('Failed to connect to Redis', error)
    }
  })().catch((error) => {
    if (redisInitialization === initialization) {
      redisInitialization = null
    }
    throw error
  })

  redisInitialization = initialization
  return initialization
}

export async function closeRedis(): Promise<void> {
  const client = redisClient
  redisClient = null
  redisClientUrl = ''
  redisInitialization = null
  if (!client) return

  try {
    if (client.status === 'ready') await client.quit()
    else client.disconnect()
  } catch {
    client.disconnect()
  }
}

export async function readRedisReadiness(): Promise<{
  configured: boolean
  required: boolean
  ready: boolean
}> {
  const config = getRedisConfig()
  if (!config.url) {
    return { configured: false, required: config.required, ready: !config.required }
  }

  try {
    const client = getRedisClient()
    if (!client) return { configured: false, required: config.required, ready: !config.required }
    await client.ping()
    return { configured: true, required: config.required, ready: true }
  } catch {
    return { configured: true, required: config.required, ready: false }
  }
}
