import type { FormError } from '@nuxt/ui'
import {
  isValidEmail,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN
} from '#shared/config/auth-validation'

export interface EmailValidationMessages {
  required: string
  invalid: string
}

export interface UsernameValidationMessages {
  required: string
  tooShort: string
  tooLong: string
  invalidCharacters: string
}

export interface PasswordValidationMessages {
  required: string
  tooShort: string
}

export interface ConfirmationValidationMessages {
  required: string
  mismatch: string
}

export interface AuthValidationMessages {
  email: EmailValidationMessages
  username: UsernameValidationMessages
  password: PasswordValidationMessages
  confirmation: ConfirmationValidationMessages
}

export function compactFormErrors(
  ...errors: Array<FormError<string> | null | undefined | false>
): FormError<string>[] {
  return errors.filter((error): error is FormError<string> => Boolean(error))
}

export function requiredTextError(
  name: string,
  value: unknown,
  message: string
): FormError<string> | null {
  return typeof value === 'string' && value.trim().length > 0
    ? null
    : { name, message }
}

export function maxLengthError(
  name: string,
  value: unknown,
  max: number,
  message: string
): FormError<string> | null {
  return typeof value === 'string' && value.trim().length > max
    ? { name, message }
    : null
}

export function emailError(
  name: string,
  value: unknown,
  messages: EmailValidationMessages
): FormError<string> | null {
  if (typeof value !== 'string' || !value.trim()) return { name, message: messages.required }
  return isValidEmail(value.trim()) ? null : { name, message: messages.invalid }
}

export function usernameError(
  name: string,
  value: unknown,
  messages: UsernameValidationMessages,
  required = true
): FormError<string> | null {
  const username = typeof value === 'string' ? value.trim() : ''
  if (!username) return required ? { name, message: messages.required } : null
  if (username.length < USERNAME_MIN_LENGTH) {
    return { name, message: messages.tooShort }
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { name, message: messages.tooLong }
  }
  return USERNAME_PATTERN.test(username)
    ? null
    : { name, message: messages.invalidCharacters }
}

export function passwordError(
  name: string,
  value: unknown,
  messages: PasswordValidationMessages
): FormError<string> | null {
  const password = typeof value === 'string' ? value : ''
  if (!password) return { name, message: messages.required }
  return password.length >= PASSWORD_MIN_LENGTH
    ? null
    : { name, message: messages.tooShort }
}

export function confirmationError(
  name: string,
  value: unknown,
  expected: string,
  messages: ConfirmationValidationMessages
): FormError<string> | null {
  if (typeof value !== 'string' || !value) return { name, message: messages.required }
  return value === expected ? null : { name, message: messages.mismatch }
}

export function integerRangeError(
  name: string,
  value: unknown,
  message: string,
  minimum: number,
  maximum?: number
): FormError<string> | null {
  const isInRange = typeof value === 'number'
    && Number.isInteger(value)
    && value >= minimum
    && (maximum === undefined || value <= maximum)
  if (isInRange) return null

  return {
    name,
    message
  }
}

export function integerError(
  name: string,
  value: unknown,
  message: string
): FormError<string> | null {
  return typeof value === 'number' && Number.isInteger(value)
    ? null
    : { name, message }
}
