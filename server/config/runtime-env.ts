import { getDatabaseDriver, getDatabaseUrl } from '~~/server/db/client'
import { getAuthSecret } from '~~/server/utils/auth-secret'
import { getRedisConfig } from '~~/server/utils/redis'
import { assertApiKeySecretConfigured } from '~~/server/utils/stored-secret'

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function collectValidationError(errors: string[], validate: () => void): void {
  try {
    validate()
  } catch (error) {
    errors.push(readErrorMessage(error))
  }
}

function validateDatabaseConfiguration(errors: string[]): void {
  let driver: ReturnType<typeof getDatabaseDriver> | undefined

  collectValidationError(errors, () => {
    driver = getDatabaseDriver()
  })

  if (driver !== 'postgres') return

  collectValidationError(errors, () => {
    getDatabaseUrl()
  })
}

function validateRedisConfiguration(errors: string[]): void {
  const redis = getRedisConfig()
  if (redis.required && !redis.url) {
    errors.push('NUXT_REDIS_URL is required when NUXT_REDIS_REQUIRED=true')
  }
}

export function getRuntimeEnvironmentErrors(): string[] {
  const errors: string[] = []

  collectValidationError(errors, getAuthSecret)
  collectValidationError(errors, assertApiKeySecretConfigured)
  validateDatabaseConfiguration(errors)
  validateRedisConfiguration(errors)

  return errors
}

export function assertRuntimeEnvironment(): void {
  const errors = getRuntimeEnvironmentErrors()
  if (errors.length === 0) return

  const details = errors.map(error => `- ${error}`).join('\n')
  throw new Error(`Invalid runtime environment:\n${details}`)
}
