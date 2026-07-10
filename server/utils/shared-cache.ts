import { randomUUID } from 'node:crypto'
import { getRedisClient, getRedisConfig } from '~~/server/utils/redis'

export interface SharedCacheClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>
  del(...keys: string[]): Promise<number>
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>
}

export interface SharedCacheOptions<TValue> {
  key: string
  ttlSeconds: number
  loader: () => Promise<TValue>
  lockMs?: number
  lockWaitMs?: number
}

export interface SharedCacheDependencies {
  getClient: () => SharedCacheClient | null
  getKeyPrefix: () => string
  now: () => number
  random: () => number
  createToken: () => string
  sleep: (milliseconds: number) => Promise<void>
}

export interface SharedCache {
  get<TValue>(options: SharedCacheOptions<TValue>): Promise<TValue>
  delete(keys: string[]): Promise<void>
  getVersion(namespace: string): Promise<number>
  incrementVersion(namespace: string): Promise<number>
}

interface MemoryCacheEntry {
  value: unknown
  expiresAt: number
}

interface CacheReadResult<TValue> {
  hit: boolean
  value?: TValue
}

const DEFAULT_LOCK_MS = 2_000
const DEFAULT_LOCK_WAIT_MS = 500
const LOCK_POLL_INTERVAL_MS = 50
const TTL_JITTER_RATIO = 0.1
const MAX_MEMORY_CACHE_ENTRIES = 500
const CACHE_WARNING_INTERVAL_MS = 60_000
const RELEASE_LOCK_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`
const INCREMENT_VERSION_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return redis.call('INCR', KEYS[1])
end
redis.call('SET', KEYS[1], 2)
return 2
`

function normalizeKeyPrefix(value: string): string {
  return value.endsWith(':') ? value : `${value}:`
}

function createDefaultDependencies(): SharedCacheDependencies {
  return {
    getClient() {
      return getRedisClient() as unknown as SharedCacheClient | null
    },
    getKeyPrefix() {
      return getRedisConfig().keyPrefix
    },
    now: Date.now,
    random: Math.random,
    createToken: randomUUID,
    sleep(milliseconds) {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
  }
}

export function createSharedCache(
  dependencies: Partial<SharedCacheDependencies> = {}
): SharedCache {
  const defaults = createDefaultDependencies()
  const resolvedDependencies: SharedCacheDependencies = { ...defaults, ...dependencies }
  const memoryCache = new Map<string, MemoryCacheEntry>()
  const inFlightLoads = new Map<string, Promise<unknown>>()
  const localVersions = new Map<string, number>()
  const warningTimestamps = new Map<string, number>()

  function toFullKey(key: string): string {
    return `${normalizeKeyPrefix(resolvedDependencies.getKeyPrefix())}${key}`
  }

  function getClientSafely(): SharedCacheClient | null {
    try {
      return resolvedDependencies.getClient()
    } catch (error) {
      warnCacheFailure('client', error)
      return null
    }
  }

  function warnCacheFailure(operation: string, error: unknown): void {
    const now = resolvedDependencies.now()
    const lastWarningAt = warningTimestamps.get(operation)
    if (lastWarningAt !== undefined && now - lastWarningAt < CACHE_WARNING_INTERVAL_MS) return

    warningTimestamps.set(operation, now)
    console.warn('[shared-cache] Redis operation failed; using database or process memory fallback', {
      operation,
      error: error instanceof Error ? error.message : String(error)
    })
  }

  function readMemory<TValue>(fullKey: string): CacheReadResult<TValue> {
    const entry = memoryCache.get(fullKey)
    if (!entry) return { hit: false }
    if (entry.expiresAt <= resolvedDependencies.now()) {
      memoryCache.delete(fullKey)
      return { hit: false }
    }
    return { hit: true, value: entry.value as TValue }
  }

  function createTtlMs(ttlSeconds: number): number {
    const boundedRandom = Math.min(Math.max(resolvedDependencies.random(), 0), 1)
    const jitterMultiplier = 1 - TTL_JITTER_RATIO + boundedRandom * TTL_JITTER_RATIO * 2
    return Math.max(1, Math.round(ttlSeconds * 1_000 * jitterMultiplier))
  }

  function writeMemory<TValue>(fullKey: string, value: TValue, ttlMs: number): void {
    if (memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
      const now = resolvedDependencies.now()
      for (const [key, entry] of memoryCache) {
        if (entry.expiresAt <= now) memoryCache.delete(key)
      }
      while (memoryCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
        const oldestKey = memoryCache.keys().next().value as string | undefined
        if (!oldestKey) break
        memoryCache.delete(oldestKey)
      }
    }
    memoryCache.set(fullKey, {
      value,
      expiresAt: resolvedDependencies.now() + ttlMs
    })
  }

  async function readRedis<TValue>(
    client: SharedCacheClient,
    fullKey: string
  ): Promise<CacheReadResult<TValue>> {
    const serialized = await client.get(fullKey)
    if (serialized === null) return { hit: false }

    try {
      return { hit: true, value: JSON.parse(serialized) as TValue }
    } catch (error) {
      warnCacheFailure('parse', error)
      try {
        await client.del(fullKey)
      } catch (deleteError) {
        warnCacheFailure('delete-corrupt', deleteError)
      }
      return { hit: false }
    }
  }

  async function writeRedis<TValue>(
    client: SharedCacheClient,
    fullKey: string,
    value: TValue,
    ttlMs: number
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value)
      if (serialized === undefined) return false
      await client.set(fullKey, serialized, 'PX', ttlMs)
      return true
    } catch (error) {
      warnCacheFailure('write', error)
      return false
    }
  }

  async function loadWithoutRedis<TValue>(
    fullKey: string,
    ttlMs: number,
    loader: () => Promise<TValue>
  ): Promise<TValue> {
    const memoryResult = readMemory<TValue>(fullKey)
    if (memoryResult.hit) return memoryResult.value as TValue

    const value = await loader()
    writeMemory(fullKey, value, ttlMs)
    return value
  }

  async function releaseLock(
    client: SharedCacheClient,
    lockKey: string,
    token: string
  ): Promise<void> {
    try {
      await client.eval(RELEASE_LOCK_SCRIPT, 1, lockKey, token)
    } catch (error) {
      warnCacheFailure('unlock', error)
    }
  }

  async function waitForRedisValue<TValue>(
    client: SharedCacheClient,
    fullKey: string,
    waitMs: number
  ): Promise<CacheReadResult<TValue>> {
    const deadline = resolvedDependencies.now() + waitMs
    while (resolvedDependencies.now() < deadline) {
      await resolvedDependencies.sleep(LOCK_POLL_INTERVAL_MS)
      try {
        const result = await readRedis<TValue>(client, fullKey)
        if (result.hit) return result
      } catch (error) {
        warnCacheFailure('wait-read', error)
        return { hit: false }
      }
    }
    return { hit: false }
  }

  async function loadWithRedis<TValue>(
    client: SharedCacheClient,
    fullKey: string,
    ttlMs: number,
    options: SharedCacheOptions<TValue>
  ): Promise<TValue> {
    const lockKey = `${fullKey}:lock`
    const token = resolvedDependencies.createToken()
    const lockMs = options.lockMs ?? DEFAULT_LOCK_MS
    let lockResult: unknown

    try {
      lockResult = await client.set(lockKey, token, 'PX', lockMs, 'NX')
    } catch (error) {
      warnCacheFailure('lock', error)
      return loadWithoutRedis(fullKey, ttlMs, options.loader)
    }

    if (lockResult !== 'OK') {
      const waitedResult = await waitForRedisValue<TValue>(
        client,
        fullKey,
        options.lockWaitMs ?? DEFAULT_LOCK_WAIT_MS
      )
      if (waitedResult.hit) return waitedResult.value as TValue

      const value = await options.loader()
      const didWrite = await writeRedis(client, fullKey, value, ttlMs)
      if (!didWrite) writeMemory(fullKey, value, ttlMs)
      return value
    }

    try {
      const value = await options.loader()
      const didWrite = await writeRedis(client, fullKey, value, ttlMs)
      if (!didWrite) writeMemory(fullKey, value, ttlMs)
      return value
    } finally {
      await releaseLock(client, lockKey, token)
    }
  }

  async function get<TValue>(options: SharedCacheOptions<TValue>): Promise<TValue> {
    const fullKey = toFullKey(options.key)
    const client = getClientSafely()
    const ttlMs = createTtlMs(options.ttlSeconds)

    async function runCoalesced(loader: () => Promise<TValue>): Promise<TValue> {
      const existingLoad = inFlightLoads.get(fullKey) as Promise<TValue> | undefined
      if (existingLoad) return existingLoad

      const pendingLoad = loader()
      inFlightLoads.set(fullKey, pendingLoad)
      try {
        return await pendingLoad
      } finally {
        inFlightLoads.delete(fullKey)
      }
    }

    if (!client) {
      return runCoalesced(() => loadWithoutRedis(fullKey, ttlMs, options.loader))
    }

    try {
      const redisResult = await readRedis<TValue>(client, fullKey)
      if (redisResult.hit) return redisResult.value as TValue
    } catch (error) {
      warnCacheFailure('read', error)
      return runCoalesced(() => loadWithoutRedis(fullKey, ttlMs, options.loader))
    }

    return runCoalesced(() => loadWithRedis(client, fullKey, ttlMs, options))
  }

  async function deleteKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return
    const fullKeys = keys.map(toFullKey)
    for (const fullKey of fullKeys) memoryCache.delete(fullKey)

    const client = getClientSafely()
    if (!client) return
    try {
      await client.del(...fullKeys)
    } catch (error) {
      warnCacheFailure('delete', error)
    }
  }

  async function getVersion(namespace: string): Promise<number> {
    const versionKey = toFullKey(`cache:version:${namespace}`)
    const client = getClientSafely()
    if (!client) return localVersions.get(versionKey) ?? 1

    try {
      const existingValue = Number(await client.get(versionKey))
      if (Number.isSafeInteger(existingValue) && existingValue > 0) return existingValue

      const initialized = await client.set(versionKey, '1', 'NX')
      if (initialized === 'OK') return 1
      const value = Number(await client.get(versionKey))
      return Number.isSafeInteger(value) && value > 0 ? value : 1
    } catch (error) {
      warnCacheFailure('version-read', error)
      return localVersions.get(versionKey) ?? 1
    }
  }

  async function incrementVersion(namespace: string): Promise<number> {
    const versionKey = toFullKey(`cache:version:${namespace}`)
    const nextLocalVersion = (localVersions.get(versionKey) ?? 1) + 1
    localVersions.set(versionKey, nextLocalVersion)

    const client = getClientSafely()
    if (!client) return nextLocalVersion
    try {
      const value = Number(await client.eval(INCREMENT_VERSION_SCRIPT, 1, versionKey))
      return Number.isSafeInteger(value) && value > 0 ? value : nextLocalVersion
    } catch (error) {
      warnCacheFailure('version-increment', error)
      return nextLocalVersion
    }
  }

  return {
    get,
    delete: deleteKeys,
    getVersion,
    incrementVersion
  }
}

const sharedCache = createSharedCache()

export function getSharedCache<TValue>(options: SharedCacheOptions<TValue>): Promise<TValue> {
  return sharedCache.get(options)
}

export function deleteSharedCache(keys: string[]): Promise<void> {
  return sharedCache.delete(keys)
}

export function getSharedCacheVersion(namespace: string): Promise<number> {
  return sharedCache.getVersion(namespace)
}

export function incrementSharedCacheVersion(namespace: string): Promise<number> {
  return sharedCache.incrementVersion(namespace)
}
