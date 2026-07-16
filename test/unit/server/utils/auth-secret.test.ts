import { afterEach, describe, expect, it, vi } from 'vitest'

const VALID_AUTH_SECRET = 'unit-test-auth-secret-with-32-bytes'

describe('getAuthSecret', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('caches the validated runtime secret', async () => {
    const useRuntimeConfig = vi.fn(() => ({
      auth: { secret: VALID_AUTH_SECRET }
    }))
    vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
    const { getAuthSecret } = await import('~~/server/utils/auth-secret')

    expect(getAuthSecret()).toBe(VALID_AUTH_SECRET)
    expect(getAuthSecret()).toBe(VALID_AUTH_SECRET)
    expect(useRuntimeConfig).toHaveBeenCalledTimes(1)
  })

  it('does not cache an invalid secret', async () => {
    const useRuntimeConfig = vi.fn(() => ({ auth: { secret: 'short' } }))
    vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
    const { getAuthSecret } = await import('~~/server/utils/auth-secret')

    expect(() => getAuthSecret()).toThrow('NUXT_AUTH_SECRET must contain at least 32 bytes')

    useRuntimeConfig.mockReturnValue({ auth: { secret: VALID_AUTH_SECRET } })
    expect(getAuthSecret()).toBe(VALID_AUTH_SECRET)
    expect(useRuntimeConfig).toHaveBeenCalledTimes(2)
  })
})
