import { z } from 'zod'

export interface TextSchemaOptions {
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

export function requiredHttpUrl(label: string, options: TextSchemaOptions = {}) {
  return requiredString(label, { max: 1000, ...options })
    .regex(/^https?:\/\//, `${label}必须以 http:// 或 https:// 开头`)
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
  .string()
  .trim()
  .min(3, minMessage('用户名', 3))
  .max(32, maxMessage('用户名', 32, '位'))
  .regex(/^[a-zA-Z0-9_-]+$/, '只能包含字母、数字、下划线和短横线')

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('请输入有效的邮箱地址'))

export const passwordSchema = z.string().min(8, minMessage('密码', 8))
