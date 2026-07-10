import { randomUUID } from 'node:crypto'
import {
  createRedisUnavailableError,
  getRedisConfig,
  initializeRedis
} from '~~/server/utils/redis'

export interface DistributedLeaseClient {
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>
}

export interface DistributedLeaseOptions {
  key: string
  ttlMs: number
  waitMs?: number
  retryIntervalMs?: number
  renewIntervalMs?: number
  required?: boolean
}

export interface DistributedLeaseResult<TValue> {
  acquired: boolean
  leaseLost: boolean
  value?: TValue
}

export interface DistributedLeaseDependencies {
  getClient: () => Promise<DistributedLeaseClient | null>
  getKeyPrefix: () => string
  isRequired: () => boolean
  now: () => number
  createToken: () => string
  sleep: (milliseconds: number) => Promise<void>
  setInterval: (callback: () => void, milliseconds: number) => NodeJS.Timeout
  clearInterval: (timer: NodeJS.Timeout) => void
}

export interface DistributedLeaseManager {
  run<TValue>(
    options: DistributedLeaseOptions,
    task: () => Promise<TValue>
  ): Promise<DistributedLeaseResult<TValue>>
}

const DEFAULT_RETRY_INTERVAL_MS = 100
const MIN_RENEW_INTERVAL_MS = 100
const MIN_LEASE_TTL_MS = 1_000
const RELEASE_LEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`
const RENEW_LEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`

function normalizeKeyPrefix(value: string): string {
  return value.endsWith(':') ? value : `${value}:`
}

function createDefaultDependencies(): DistributedLeaseDependencies {
  return {
    async getClient() {
      return await initializeRedis() as unknown as DistributedLeaseClient | null
    },
    getKeyPrefix() {
      return getRedisConfig().keyPrefix
    },
    isRequired() {
      return getRedisConfig().required
    },
    now: Date.now,
    createToken: randomUUID,
    sleep(milliseconds) {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    },
    setInterval(callback, milliseconds) {
      return globalThis.setInterval(callback, milliseconds)
    },
    clearInterval(timer) {
      globalThis.clearInterval(timer)
    }
  }
}

export function createDistributedLeaseManager(
  dependencies: Partial<DistributedLeaseDependencies> = {}
): DistributedLeaseManager {
  const resolvedDependencies: DistributedLeaseDependencies = {
    ...createDefaultDependencies(),
    ...dependencies
  }
  const localLeases = new Set<string>()

  function toFullKey(key: string): string {
    return `${normalizeKeyPrefix(resolvedDependencies.getKeyPrefix())}lease:${key}`
  }

  function isRequired(options: DistributedLeaseOptions): boolean {
    return options.required ?? resolvedDependencies.isRequired()
  }

  async function runWithLocalLease<TValue>(
    fullKey: string,
    options: DistributedLeaseOptions,
    task: () => Promise<TValue>
  ): Promise<DistributedLeaseResult<TValue>> {
    const deadline = resolvedDependencies.now() + (options.waitMs ?? 0)
    const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS

    while (localLeases.has(fullKey)) {
      if (resolvedDependencies.now() >= deadline) {
        return { acquired: false, leaseLost: false }
      }
      await resolvedDependencies.sleep(retryIntervalMs)
    }

    localLeases.add(fullKey)
    try {
      return {
        acquired: true,
        leaseLost: false,
        value: await task()
      }
    } finally {
      localLeases.delete(fullKey)
    }
  }

  async function releaseRedisLease(
    client: DistributedLeaseClient,
    fullKey: string,
    token: string
  ): Promise<void> {
    try {
      await client.eval(RELEASE_LEASE_SCRIPT, 1, fullKey, token)
    } catch (error) {
      console.warn('[distributed-lease] Failed to release Redis lease', {
        key: fullKey,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  async function runWithRedisLease<TValue>(
    client: DistributedLeaseClient,
    fullKey: string,
    token: string,
    options: DistributedLeaseOptions,
    task: () => Promise<TValue>
  ): Promise<DistributedLeaseResult<TValue>> {
    let leaseLost = false
    let isRenewing = false
    let renewalPromise: Promise<void> | null = null
    const renewIntervalMs = Math.min(
      Math.max(
        options.renewIntervalMs ?? Math.floor(options.ttlMs / 3),
        MIN_RENEW_INTERVAL_MS
      ),
      Math.floor(options.ttlMs / 2)
    )
    const renewalTimer = resolvedDependencies.setInterval(() => {
      if (isRenewing || leaseLost) return
      isRenewing = true
      renewalPromise = client.eval(RENEW_LEASE_SCRIPT, 1, fullKey, token, String(options.ttlMs))
        .then((result) => {
          if (Number(result) !== 1) leaseLost = true
        })
        .catch((error) => {
          leaseLost = true
          console.error('[distributed-lease] Failed to renew Redis lease', {
            key: fullKey,
            error: error instanceof Error ? error.message : String(error)
          })
        })
        .finally(() => {
          isRenewing = false
          renewalPromise = null
        })
    }, renewIntervalMs)
    renewalTimer.unref?.()

    try {
      const value = await task()
      resolvedDependencies.clearInterval(renewalTimer)
      await renewalPromise
      return { acquired: true, leaseLost, value }
    } finally {
      resolvedDependencies.clearInterval(renewalTimer)
      await renewalPromise
      await releaseRedisLease(client, fullKey, token)
    }
  }

  async function run<TValue>(
    options: DistributedLeaseOptions,
    task: () => Promise<TValue>
  ): Promise<DistributedLeaseResult<TValue>> {
    if (!Number.isFinite(options.ttlMs) || options.ttlMs < MIN_LEASE_TTL_MS) {
      throw new Error(`Distributed lease ttlMs must be at least ${MIN_LEASE_TTL_MS}`)
    }

    const normalizedOptions: DistributedLeaseOptions = {
      ...options,
      ttlMs: Math.trunc(options.ttlMs),
      waitMs: Math.max(Math.trunc(options.waitMs ?? 0), 0),
      retryIntervalMs: Math.max(Math.trunc(options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS), 1)
    }
    const fullKey = toFullKey(normalizedOptions.key)
    const required = isRequired(normalizedOptions)
    let client: DistributedLeaseClient | null

    try {
      client = await resolvedDependencies.getClient()
    } catch (error) {
      if (required) {
        throw createRedisUnavailableError('Redis coordination is unavailable', error)
      }
      return runWithLocalLease(fullKey, normalizedOptions, task)
    }

    if (!client) {
      if (required) {
        throw createRedisUnavailableError('Redis coordination requires NUXT_REDIS_URL')
      }
      return runWithLocalLease(fullKey, normalizedOptions, task)
    }

    const deadline = resolvedDependencies.now() + (normalizedOptions.waitMs ?? 0)
    const retryIntervalMs = normalizedOptions.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS
    const token = resolvedDependencies.createToken()

    while (true) {
      try {
        const acquired = await client.set(fullKey, token, 'PX', normalizedOptions.ttlMs, 'NX') === 'OK'
        if (acquired) {
          return runWithRedisLease(client, fullKey, token, normalizedOptions, task)
        }
      } catch (error) {
        if (required) {
          throw createRedisUnavailableError('Redis coordination is unavailable', error)
        }
        return runWithLocalLease(fullKey, normalizedOptions, task)
      }

      if (resolvedDependencies.now() >= deadline) {
        return { acquired: false, leaseLost: false }
      }
      await resolvedDependencies.sleep(retryIntervalMs)
    }
  }

  return { run }
}

const distributedLeaseManager = createDistributedLeaseManager()

export function withDistributedLease<TValue>(
  options: DistributedLeaseOptions,
  task: () => Promise<TValue>
): Promise<DistributedLeaseResult<TValue>> {
  return distributedLeaseManager.run(options, task)
}
