import { describe, expect, it, vi } from 'vitest'
import {
  createDistributedLeaseManager,
  type DistributedLeaseClient
} from '~~/server/utils/distributed-lease'

function createClient(overrides: Partial<DistributedLeaseClient> = {}): DistributedLeaseClient {
  return {
    set: vi.fn(async () => 'OK'),
    eval: vi.fn(async () => 1),
    ...overrides
  }
}

function createManager(options: {
  client?: DistributedLeaseClient | null
  getClient?: () => Promise<DistributedLeaseClient | null>
  required?: boolean
} = {}) {
  return createDistributedLeaseManager({
    getClient: options.getClient ?? (async () => options.client ?? null),
    getKeyPrefix: () => 'test:',
    isRequired: () => options.required ?? false,
    createToken: () => 'lease-token'
  })
}

describe('distributed lease', () => {
  it('acquires and token-safely releases a Redis lease', async () => {
    const client = createClient()
    const manager = createManager({ client })

    await expect(manager.run({ key: 'worker', ttlMs: 300_000 }, async () => 'done')).resolves.toEqual({
      acquired: true,
      value: 'done'
    })
    expect(client.set).toHaveBeenCalledWith('test:lease:worker', 'lease-token', 'PX', 300_000, 'NX')
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call(\'DEL\''),
      1,
      'test:lease:worker',
      'lease-token'
    )
  })

  it('skips work when another instance owns the lease', async () => {
    const task = vi.fn(async () => 'done')
    const manager = createManager({ client: createClient({ set: vi.fn(async () => null) }) })

    await expect(manager.run({ key: 'worker', ttlMs: 300_000 }, task)).resolves.toEqual({ acquired: false })
    expect(task).not.toHaveBeenCalled()
  })

  it('uses a process-local lease when optional Redis is unavailable', async () => {
    const manager = createManager({ getClient: async () => { throw new Error('offline') } })

    await expect(manager.run({ key: 'worker', ttlMs: 300_000 }, async () => 'done')).resolves.toEqual({
      acquired: true,
      value: 'done'
    })
  })

  it('fails closed when Redis coordination is required', async () => {
    const manager = createManager({
      required: true,
      getClient: async () => { throw new Error('offline') }
    })

    await expect(manager.run({ key: 'worker', ttlMs: 300_000 }, async () => 'done')).rejects.toMatchObject({
      code: 'REDIS_UNAVAILABLE',
      statusCode: 503
    })
  })

  it('prevents overlapping local work in one process', async () => {
    let releaseFirstTask: (() => void) | undefined
    const firstTask = new Promise<void>((resolve) => {
      releaseFirstTask = resolve
    })
    const manager = createManager()
    const firstRun = manager.run({ key: 'worker', ttlMs: 300_000 }, () => firstTask)

    await Promise.resolve()
    await expect(manager.run({ key: 'worker', ttlMs: 300_000 }, async () => {})).resolves.toEqual({ acquired: false })
    releaseFirstTask?.()
    await expect(firstRun).resolves.toMatchObject({ acquired: true })
  })
})
