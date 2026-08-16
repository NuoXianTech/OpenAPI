import { z } from 'zod'
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN
} from '#shared/config/auth-validation'
import { isSafePublicUrl, isSafeSiteOrigin } from '#shared/utils/safe-url'

interface TextSchemaOptions {
  max?: number
  trim?: boolean
  unit?: string
}

export function requiredMessage(label: string) {
  return `${label}不能为空`
}

export function maxMessage(label: string, max: number, unit = '字') {
  return `${label}最多 ${max} ${unit}`
}

export function minMessage(label: string, min: number, unit = '位') {
  return `${label}至少 ${min} ${unit}`
}

export function enumMessage(label: string, values: readonly string[]) {
  return `${label}必须是 ${values.join(' / ')}`
}

export function atLeastOneFieldMessage() {
  return '至少需要修改一个字段'
}

export function requiredString(label: string, options: TextSchemaOptions = {}) {
  const unit = options.unit ?? '字'
  let schema = options.trim === false ? z.string() : z.string().trim()
  schema = schema.min(1, requiredMessage(label))
  if (options.max !== undefined) {
    schema = schema.max(options.max, maxMessage(label, options.max, unit))
  }
  return schema
}

export function optionalString(label: string, options: TextSchemaOptions = {}) {
  const unit = options.unit ?? '字'
  let schema = options.trim === false ? z.string() : z.string().trim()
  if (options.max !== undefined) {
    schema = schema.max(options.max, maxMessage(label, options.max, unit))
  }
  return schema.optional()
}

export function requiredSiteOrigin(label: string) {
  return requiredString(label, { max: 1000 })
    .refine(isSafeSiteOrigin, `${label}必须是有效的 http:// 或 https:// 站点 origin`)
}

function optionalPublicUrl(label: string, max = 1000) {
  return z.string().trim().max(max, maxMessage(label, max)).refine(
    value => value === '' || isSafePublicUrl(value, { allowRelative: true }),
    `${label}必须是 http://、https:// 或站内相对路径`
  ).optional()
}

export function nullablePublicUrl(label: string, max = 1000) {
  return optionalPublicUrl(label, max).nullable()
}

export function requiredPublicUrl(label: string, max = 1000) {
  return requiredString(label, { max })
    .refine(value => isSafePublicUrl(value), `${label}必须是有效的 http:// 或 https:// 地址`)
}

export function positiveInt(label: string) {
  return z.coerce.number().int().positive(`${label}必须为正整数`)
}

export function nonNegativeInt(label: string) {
  return z.coerce.number().int().min(0, `${label}不能小于 0`)
}

export function intRange(label: string, min: number, max: number) {
  return z.coerce
    .number()
    .int()
    .min(min, `${label}必须在 ${min} 到 ${max} 之间`)
    .max(max, `${label}必须在 ${min} 到 ${max} 之间`)
}

export const usernameSchema = z
  .string({ error: requiredMessage('用户名') })
  .trim()
  .min(USERNAME_MIN_LENGTH, minMessage('用户名', USERNAME_MIN_LENGTH))
  .max(USERNAME_MAX_LENGTH, maxMessage('用户名', USERNAME_MAX_LENGTH, '位'))
  .regex(USERNAME_PATTERN, '只能包含字母、数字、下划线和短横线')

export const emailSchema = z
  .string({ error: requiredMessage('邮箱') })
  .trim()
  .toLowerCase()
  .pipe(z.email('请输入有效的邮箱地址'))

export const passwordSchema = z
  .string({ error: requiredMessage('密码') })
  .min(PASSWORD_MIN_LENGTH, minMessage('密码', PASSWORD_MIN_LENGTH))
