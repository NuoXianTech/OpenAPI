import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiKeyError: null as Error | null,
  authError: null as Error | null
}))

vi.mock('~~/server/utils/stored-secret', () => ({
  assertApiKeySecretConfigured() {
    if (mocks.apiKeyError) throw mocks.apiKeyError
  }
}))

vi.mock('~~/server/utils/auth-secret', () => ({
  getAuthSecret() {
    if (mocks.authError) throw mocks.authError
    return 'valid-auth-secret-with-at-least-32-bytes'
  }
}))

const { assertRuntimeEnvironment, getRuntimeEnvironmentErrors } = await import(
  '~~/server/config/runtime-env'
)

describe('runtime environment validation', () => {
  beforeEach(() => {
    mocks.apiKeyError = null
    mocks.authError = null
  })

  it('accepts a valid single-instance PGlite configuration', () => {
    expect(getRuntimeEnvironmentErrors()).toEqual([])
    expect(() => assertRuntimeEnvironment()).not.toThrow()
  })

  it('collects all missing required values in one error', () => {
    mocks.authError = new Error('NUXT_AUTH_SECRET must contain at least 32 bytes')
    mocks.apiKeyError = new Error('NUXT_API_KEY_SECRET is required')

    expect(() => assertRuntimeEnvironment()).toThrow(
      [
        'Invalid runtime environment:',
        '- NUXT_AUTH_SECRET must contain at least 32 bytes',
        '- NUXT_API_KEY_SECRET is required'
      ].join('\n')
    )
  })
})
