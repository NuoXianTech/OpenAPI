import { getAuthSecret } from '~~/server/utils/auth-secret'
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

export function getRuntimeEnvironmentErrors(): string[] {
  const errors: string[] = []

  collectValidationError(errors, getAuthSecret)
  collectValidationError(errors, assertApiKeySecretConfigured)

  return errors
}

export function assertRuntimeEnvironment(): void {
  const errors = getRuntimeEnvironmentErrors()
  if (errors.length === 0) return

  const details = errors.map(error => `- ${error}`).join('\n')
  throw new Error(`Invalid runtime environment:\n${details}`)
}
