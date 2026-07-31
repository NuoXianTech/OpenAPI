import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiKeyError: null as Error | null,
  authError: null as Error | null,
  databaseDriver: 'pglite' as 'pglite' | 'postgres',
  databaseError: null as Error | null,
  redisRequired: false,
  redisUrl: ''
}))

vi.mock('~~/server/db/client', () => ({
  getDatabaseDriver() {
    if (mocks.databaseError) throw mocks.databaseError
    return mocks.databaseDriver
  },
  getDatabaseUrl() {
    if (mocks.databaseError) throw mocks.databaseError
    return 'postgresql://user:password@127.0.0.1:5432/openapi'
  }
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

vi.mock('~~/server/utils/redis', () => ({
  getRedisConfig() {
    return {
      url: mocks.redisUrl,
      keyPrefix: 'openapi:',
      connectTimeoutMs: 2_000,
      required: mocks.redisRequired
    }
  }
}))

const { assertRuntimeEnvironment, getRuntimeEnvironmentErrors } = await import(
  '~~/server/config/runtime-env'
)

describe('runtime environment validation', () => {
  beforeEach(() => {
    mocks.apiKeyError = null
    mocks.authError = null
    mocks.databaseDriver = 'pglite'
    mocks.databaseError = null
    mocks.redisRequired = false
    mocks.redisUrl = ''
  })

  it('accepts a valid single-instance PGlite configuration', () => {
    expect(getRuntimeEnvironmentErrors()).toEqual([])
    expect(() => assertRuntimeEnvironment()).not.toThrow()
  })

  it('collects all missing required values in one error', () => {
    mocks.authError = new Error('NUXT_AUTH_SECRET must contain at least 32 bytes')
    mocks.apiKeyError = new Error('NUXT_API_KEY_SECRET is required')
    mocks.databaseDriver = 'postgres'
    mocks.databaseError = new Error('DATABASE_URL is required')
    mocks.redisRequired = true

    expect(() => assertRuntimeEnvironment()).toThrow(
      [
        'Invalid runtime environment:',
        '- NUXT_AUTH_SECRET must contain at least 32 bytes',
        '- NUXT_API_KEY_SECRET is required',
        '- DATABASE_URL is required',
        '- NUXT_REDIS_URL is required when NUXT_REDIS_REQUIRED=true'
      ].join('\n')
    )
  })

  it('does not require Redis in optional mode', () => {
    mocks.redisRequired = false
    mocks.redisUrl = ''

    expect(getRuntimeEnvironmentErrors()).toEqual([])
  })
})
