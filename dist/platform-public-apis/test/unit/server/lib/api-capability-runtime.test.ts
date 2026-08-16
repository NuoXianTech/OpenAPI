import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadConfig: vi.fn()
}))

vi.mock('~~/server/lib/api-capabilities/config-service', () => ({
  loadApiCapabilityConfig: mocks.loadConfig
}))

const { loadApiCapabilityStringSet } = await import('~~/server/lib/api-capabilities/runtime')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  mocks.loadConfig.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('API capability runtime protection', () => {
  it('temporarily fails closed without retrying or flooding logs', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.loadConfig.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(loadApiCapabilityStringSet('v1', 'example', 'enabledItems')).resolves.toEqual(new Set())
    await expect(loadApiCapabilityStringSet('v1', 'example', 'enabledItems')).resolves.toEqual(new Set())

    expect(mocks.loadConfig).toHaveBeenCalledTimes(1)
    expect(consoleError).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5_001)
    mocks.loadConfig.mockResolvedValueOnce({ values: { enabledItems: ['first'] } })

    await expect(loadApiCapabilityStringSet('v1', 'example', 'enabledItems'))
      .resolves.toEqual(new Set(['first']))
    expect(mocks.loadConfig).toHaveBeenCalledTimes(2)
  })
})
