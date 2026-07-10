import type { FormError } from '@nuxt/ui'
import {
  isValidEmail,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN
} from '#shared/config/auth-validation'

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

export function emailError(name: string, value: unknown): FormError<string> | null {
  if (typeof value !== 'string' || !value.trim()) return { name, message: '邮箱不能为空' }
  return isValidEmail(value.trim()) ? null : { name, message: '请输入有效的邮箱地址' }
}

export function usernameError(
  name: string,
  value: unknown,
  required = true
): FormError<string> | null {
  const username = typeof value === 'string' ? value.trim() : ''
  if (!username) return required ? { name, message: '用户名不能为空' } : null
  if (username.length < USERNAME_MIN_LENGTH) {
    return { name, message: `用户名至少 ${USERNAME_MIN_LENGTH} 位` }
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { name, message: `用户名最多 ${USERNAME_MAX_LENGTH} 位` }
  }
  return USERNAME_PATTERN.test(username)
    ? null
    : { name, message: '只能包含字母、数字、下划线和短横线' }
}

export function passwordError(name: string, value: unknown): FormError<string> | null {
  const password = typeof value === 'string' ? value : ''
  if (!password) return { name, message: '密码不能为空' }
  return password.length >= PASSWORD_MIN_LENGTH
    ? null
    : { name, message: `密码至少 ${PASSWORD_MIN_LENGTH} 位` }
}

export function confirmationError(
  name: string,
  value: unknown,
  expected: string
): FormError<string> | null {
  if (typeof value !== 'string' || !value) return { name, message: '请再次输入密码' }
  return value === expected ? null : { name, message: '两次输入的密码不一致' }
}

export function integerRangeError(
  name: string,
  value: unknown,
  label: string,
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
    message: maximum === undefined
      ? `${label}必须是不小于 ${minimum} 的整数`
      : `${label}必须是 ${minimum} 到 ${maximum} 之间的整数`
  }
}

export function integerError(
  name: string,
  value: unknown,
  label: string
): FormError<string> | null {
  return typeof value === 'number' && Number.isInteger(value)
    ? null
    : { name, message: `${label}必须是整数` }
}
