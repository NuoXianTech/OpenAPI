import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn()
}))

vi.mock('~~/server/services/system-settings-service', () => ({
  systemSettingsService: {
    getSettings: mocks.getSettings
  }
}))

function settings() {
  return {
    clientIpSource: 'x_forwarded_for',
    trustedProxyCidrs: '127.0.0.1/32',
    clientIpForwardedHops: 1
  }
}

async function loadService() {
  vi.resetModules()
  return (await import('~~/server/services/client-ip-config-service')).clientIpConfigService
}

describe('client IP configuration service', () => {
  beforeEach(() => {
    mocks.getSettings.mockReset()
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('backs off after a database refresh failure instead of retrying on every request', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const service = await loadService()
    mocks.getSettings.mockResolvedValueOnce(settings())

    await expect(service.getEffectiveConfig()).resolves.toMatchObject({
      source: 'x_forwarded_for',
      trustedProxyCidrs: ['127.0.0.1/32']
    })

    vi.mocked(Date.now).mockReturnValue(7_000)
    mocks.getSettings.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(service.getEffectiveConfig()).resolves.toMatchObject({
      source: 'x_forwarded_for',
      trustedProxyCidrs: ['127.0.0.1/32']
    })
    await service.getEffectiveConfig()

    expect(mocks.getSettings).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
