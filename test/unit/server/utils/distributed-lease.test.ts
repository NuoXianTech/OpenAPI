import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  now?: () => number
  sleep?: (milliseconds: number) => Promise<void>
  setInterval?: (callback: () => void, milliseconds: number) => NodeJS.Timeout
} = {}) {
  return createDistributedLeaseManager({
    getClient: options.getClient ?? (async () => options.client ?? null),
    getKeyPrefix: () => 'test:',
    isRequired: () => options.required ?? false,
    now: options.now ?? (() => 1_000),
    createToken: () => 'lease-token',
    sleep: options.sleep ?? (async () => {}),
    setInterval: options.setInterval ?? vi.fn(() => ({ unref: vi.fn() }) as unknown as NodeJS.Timeout),
    clearInterval: vi.fn()
  })
}

describe('distributed lease', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('acquires and token-safely releases a Redis lease', async () => {
    const client = createClient()
    const manager = createManager({ client })
    const task = vi.fn(async () => 'done')

    await expect(manager.run({ key: 'worker', ttlMs: 10_000 }, task)).resolves.toEqual({
      acquired: true,
      leaseLost: false,
      value: 'done'
    })
    expect(client.set).toHaveBeenCalledWith('test:lease:worker', 'lease-token', 'PX', 10_000, 'NX')
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call(\'DEL\''),
      1,
      'test:lease:worker',
      'lease-token'
    )
    expect(task).toHaveBeenCalledOnce()
  })

  it('skips work when another instance owns the lease', async () => {
    const client = createClient({ set: vi.fn(async () => null) })
    const manager = createManager({ client })
    const task = vi.fn(async () => 'done')

    await expect(manager.run({ key: 'worker', ttlMs: 10_000 }, task)).resolves.toEqual({
      acquired: false,
      leaseLost: false
    })
    expect(task).not.toHaveBeenCalled()
  })

  it('falls back to a process-local lease when Redis is optional', async () => {
    const manager = createManager({
      getClient: async () => { throw new Error('offline') }
    })

    await expect(manager.run({ key: 'worker', ttlMs: 10_000 }, async () => 'done')).resolves.toEqual({
      acquired: true,
      leaseLost: false,
      value: 'done'
    })
  })

  it('fails closed when Redis coordination is required', async () => {
    const manager = createManager({
      required: true,
      getClient: async () => { throw new Error('offline') }
    })

    await expect(manager.run({ key: 'worker', ttlMs: 10_000 }, async () => 'done')).rejects.toMatchObject({
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
    const firstRun = manager.run({ key: 'worker', ttlMs: 10_000 }, () => firstTask)

    await Promise.resolve()
    await expect(manager.run({ key: 'worker', ttlMs: 10_000 }, async () => {})).resolves.toEqual({
      acquired: false,
      leaseLost: false
    })

    releaseFirstTask?.()
    await expect(firstRun).resolves.toMatchObject({ acquired: true, leaseLost: false })
  })

  it('renews a long-running lease before releasing it', async () => {
    let renewalCallback: (() => void) | undefined
    let finishTask: ((value: string) => void) | undefined
    const client = createClient()
    const manager = createManager({
      client,
      setInterval(callback) {
        renewalCallback = callback
        return { unref: vi.fn() } as unknown as NodeJS.Timeout
      }
    })
    const run = manager.run({ key: 'worker', ttlMs: 9_000 }, () => new Promise<string>((resolve) => {
      finishTask = resolve
    }))

    await vi.waitFor(() => expect(renewalCallback).toBeTypeOf('function'))
    renewalCallback?.()
    await vi.waitFor(() => expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('PEXPIRE'),
      1,
      'test:lease:worker',
      'lease-token',
      '9000'
    ))
    finishTask?.('done')

    await expect(run).resolves.toEqual({ acquired: true, leaseLost: false, value: 'done' })
  })

  it('rejects leases that can expire before renewal is safe', async () => {
    const manager = createManager()

    await expect(manager.run({ key: 'worker', ttlMs: 999 }, async () => {})).rejects.toThrow(
      'ttlMs must be at least 1000'
    )
  })
})
