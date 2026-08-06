import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createSharedCache,
  type SharedCacheClient
} from '~~/server/utils/shared-cache'

interface FakeRedisOptions {
  initial?: Record<string, string>
  canAcquireLock?: boolean
}

function createFakeRedis(options: FakeRedisOptions = {}) {
  const values = new Map(Object.entries(options.initial ?? {}))
  const set = vi.fn(async (key: string, value: string, ...args: Array<string | number>) => {
    if (args.includes('NX') && (values.has(key) || options.canAcquireLock === false)) return null
    values.set(key, value)
    return 'OK'
  })
  const client: SharedCacheClient = {
    get: vi.fn(async key => values.get(key) ?? null),
    set,
    del: vi.fn(async (...keys) => {
      let deleted = 0
      for (const key of keys) {
        if (values.delete(key)) deleted += 1
      }
      return deleted
    }),
    eval: vi.fn(async (script, _numberOfKeys, key, token) => {
      if (script.includes('redis.call(\'EXISTS\'')) {
        const next = Number(values.get(key) ?? '1') + 1
        values.set(key, String(next))
        return next
      }
      if (values.get(key) !== token) return 0
      values.delete(key)
      return 1
    })
  }
  return { client, values, set }
}

function createTestCache(client: SharedCacheClient | null, overrides: {
  now?: () => number
  random?: () => number
  sleep?: (milliseconds: number) => Promise<void>
} = {}) {
  return createSharedCache({
    getClient: () => client,
    getKeyPrefix: () => 'test:',
    now: overrides.now ?? (() => 1_000),
    random: overrides.random ?? (() => 0.5),
    createToken: () => 'lock-token',
    sleep: overrides.sleep ?? (async () => {})
  })
}

describe('shared cache', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a Redis hit without invoking the loader', async () => {
    const { client } = createFakeRedis({ initial: { 'test:cache:item': JSON.stringify({ id: 1 }) } })
    const cache = createTestCache(client)
    const loader = vi.fn(async () => ({ id: 2 }))

    await expect(cache.get({ key: 'cache:item', ttlSeconds: 10, loader })).resolves.toEqual({ id: 1 })
    expect(loader).not.toHaveBeenCalled()
  })

  it('coalesces concurrent misses in one process', async () => {
    const { client } = createFakeRedis()
    const cache = createTestCache(client)
    const loader = vi.fn(async () => ({ id: 1 }))

    const results = await Promise.all([
      cache.get({ key: 'cache:item', ttlSeconds: 10, loader }),
      cache.get({ key: 'cache:item', ttlSeconds: 10, loader })
    ])

    expect(results).toEqual([{ id: 1 }, { id: 1 }])
    expect(loader).toHaveBeenCalledOnce()
  })

  it('lets an aborted caller leave the shared producer running', async () => {
    const cache = createTestCache(null)
    let resolveLoad!: (value: { id: number }) => void
    const loader = vi.fn(() => new Promise<{ id: number }>((resolve) => {
      resolveLoad = resolve
    }))
    const controller = new AbortController()
    const first = cache.get({
      key: 'cache:item',
      ttlSeconds: 10,
      loader,
      signal: controller.signal
    })
    const second = cache.get({ key: 'cache:item', ttlSeconds: 10, loader })

    controller.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })

    resolveLoad({ id: 1 })
    await expect(second).resolves.toEqual({ id: 1 })
    expect(loader).toHaveBeenCalledOnce()
  })

  it('coalesces and caches loads when Redis reads fail', async () => {
    const loader = vi.fn(async () => ({ id: 1 }))
    const client = createFakeRedis().client
    vi.mocked(client.get).mockRejectedValue(new Error('offline'))
    const cache = createTestCache(client)

    await expect(Promise.all([
      cache.get({ key: 'cache:item', ttlSeconds: 10, loader }),
      cache.get({ key: 'cache:item', ttlSeconds: 10, loader })
    ])).resolves.toEqual([{ id: 1 }, { id: 1 }])
    await expect(cache.get({ key: 'cache:item', ttlSeconds: 10, loader })).resolves.toEqual({ id: 1 })
    expect(loader).toHaveBeenCalledOnce()
  })

  it('applies ten percent TTL jitter to Redis writes', async () => {
    const { client, set } = createFakeRedis()
    const cache = createTestCache(client, { random: () => 1 })

    await cache.get({ key: 'cache:item', ttlSeconds: 10, loader: async () => ({ id: 1 }) })

    expect(set).toHaveBeenCalledWith('test:cache:item', JSON.stringify({ id: 1 }), 'PX', 11_000)
  })

  it('deletes Redis and local fallback entries', async () => {
    const client = createFakeRedis().client
    vi.mocked(client.get).mockRejectedValue(new Error('offline'))
    const cache = createTestCache(client)
    const loader = vi.fn(async () => ({ id: 1 }))
    await cache.get({ key: 'cache:item', ttlSeconds: 10, loader })

    await cache.delete(['cache:item'])
    await cache.get({ key: 'cache:item', ttlSeconds: 10, loader })

    expect(client.del).toHaveBeenCalledWith('test:cache:item')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('waits for the lock owner to publish a value', async () => {
    let now = 1_000
    const { client, values } = createFakeRedis({ canAcquireLock: false })
    const cache = createTestCache(client, {
      now: () => now,
      sleep: async () => {
        now += 50
        values.set('test:cache:item', JSON.stringify({ id: 1 }))
      }
    })
    const loader = vi.fn(async () => ({ id: 2 }))

    await expect(cache.get({ key: 'cache:item', ttlSeconds: 10, loader })).resolves.toEqual({ id: 1 })
    expect(loader).not.toHaveBeenCalled()
  })

  it('deletes malformed JSON and reloads a valid value', async () => {
    const { client } = createFakeRedis({ initial: { 'test:cache:item': '{broken' } })
    const cache = createTestCache(client)

    await expect(cache.get({
      key: 'cache:item',
      ttlSeconds: 10,
      loader: async () => ({ id: 1 })
    })).resolves.toEqual({ id: 1 })

    expect(client.del).toHaveBeenCalledWith('test:cache:item')
  })

  it('increments a version from an initialized baseline', async () => {
    const { client } = createFakeRedis()
    const cache = createTestCache(client)

    await expect(cache.getVersion('public-apis')).resolves.toBe(1)
    await expect(cache.incrementVersion('public-apis')).resolves.toBe(2)
  })
})
