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
  required?: boolean
}

export interface DistributedLeaseDependencies {
  getClient: () => Promise<DistributedLeaseClient | null>
  getKeyPrefix: () => string
  isRequired: () => boolean
  createToken: () => string
}

export interface DistributedLeaseResult<TValue> {
  acquired: boolean
  value?: TValue
}

const MIN_LEASE_TTL_MS = 1_000
const RELEASE_LEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`

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
    createToken: randomUUID
  }
}

export function createDistributedLeaseManager(
  dependencies: Partial<DistributedLeaseDependencies> = {}
) {
  const resolvedDependencies = { ...createDefaultDependencies(), ...dependencies }
  const localLeases = new Set<string>()

  function toFullKey(key: string): string {
    return `${resolvedDependencies.getKeyPrefix()}lease:${key}`
  }

  async function runWithLocalLease<TValue>(
    fullKey: string,
    task: () => Promise<TValue>
  ): Promise<DistributedLeaseResult<TValue>> {
    if (localLeases.has(fullKey)) return { acquired: false }

    localLeases.add(fullKey)
    try {
      return { acquired: true, value: await task() }
    } finally {
      localLeases.delete(fullKey)
    }
  }

  async function run<TValue>(
    options: DistributedLeaseOptions,
    task: () => Promise<TValue>
  ): Promise<DistributedLeaseResult<TValue>> {
    if (!Number.isFinite(options.ttlMs) || options.ttlMs < MIN_LEASE_TTL_MS) {
      throw new Error(`Distributed lease ttlMs must be at least ${MIN_LEASE_TTL_MS}`)
    }

    const fullKey = toFullKey(options.key)
    const required = options.required ?? resolvedDependencies.isRequired()
    let client: DistributedLeaseClient | null

    try {
      client = await resolvedDependencies.getClient()
    } catch (error) {
      if (required) throw createRedisUnavailableError('Redis coordination is unavailable', error)
      return runWithLocalLease(fullKey, task)
    }

    if (!client) {
      if (required) throw createRedisUnavailableError('Redis coordination requires NUXT_REDIS_URL')
      return runWithLocalLease(fullKey, task)
    }

    const token = resolvedDependencies.createToken()
    try {
      const acquired = await client.set(fullKey, token, 'PX', Math.trunc(options.ttlMs), 'NX') === 'OK'
      if (!acquired) return { acquired: false }
    } catch (error) {
      if (required) throw createRedisUnavailableError('Redis coordination is unavailable', error)
      return runWithLocalLease(fullKey, task)
    }

    try {
      return { acquired: true, value: await task() }
    } finally {
      try {
        await client.eval(RELEASE_LEASE_SCRIPT, 1, fullKey, token)
      } catch (error) {
        console.warn('[distributed-lease] Failed to release Redis lease', {
          key: fullKey,
          error: error instanceof Error ? error.message : String(error)
        })
      }
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
