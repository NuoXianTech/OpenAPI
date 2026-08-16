import { z } from 'zod'
import { ADMIN_LOG_TYPES } from '#shared/types/admin'
import type { LoginMethod } from '#shared/types/login-log'

const LOGIN_METHODS = ['password', 'oauth_github', 'oauth_qq'] as const satisfies readonly LoginMethod[]
const cleanupControlShape = {
  confirm: z.literal(true),
  deleteAll: z.boolean().optional()
}
const optionalText = z.string().trim().max(500).optional()
const optionalPositiveInteger = z.number().int().positive().optional()
const optionalDate = z.iso.datetime({ offset: true })
  .transform(value => new Date(value))
  .optional()

function hasFilterValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return false
  return !Array.isArray(value) || value.length > 0
}

function addCleanupValidation(
  data: Record<string, unknown>,
  context: z.RefinementCtx
) {
  const { confirm: _confirm, deleteAll, ...filters } = data
  const hasFilters = Object.values(filters).some(hasFilterValue)
  if (!hasFilters && deleteAll !== true) {
    context.addIssue({
      code: 'custom',
      message: '无筛选条件时必须显式确认清理全部日志',
      path: ['deleteAll']
    })
  }
  if (hasFilters && deleteAll === true) {
    context.addIssue({
      code: 'custom',
      message: '条件清理不能同时标记为清理全部日志',
      path: ['deleteAll']
    })
  }
  const startAt = filters.startAt
  const endAt = filters.endAt
  if (startAt instanceof Date && endAt instanceof Date && startAt > endAt) {
    context.addIssue({ code: 'custom', message: '开始时间不能晚于结束时间', path: ['startAt'] })
  }
}

export const adminCleanupApiCallLogsSchema = z.object({
  ...cleanupControlShape,
  keyword: optionalText,
  startAt: optionalDate,
  endAt: optionalDate,
  routeId: z.uuid().optional(),
  categoryId: optionalPositiveInteger,
  types: z.array(z.enum(ADMIN_LOG_TYPES)).max(1).optional(),
  userId: optionalPositiveInteger,
  apiKeyId: optionalPositiveInteger,
  requestId: z.uuid().optional()
}).strict().superRefine(addCleanupValidation)

export const adminCleanupLoginLogsSchema = z.object({
  ...cleanupControlShape,
  keyword: optionalText,
  startAt: optionalDate,
  endAt: optionalDate,
  method: z.enum(LOGIN_METHODS).optional(),
  success: z.boolean().optional(),
  userId: optionalPositiveInteger
}).strict().superRefine(addCleanupValidation)

export const adminCleanupOperationLogsSchema = z.object({
  ...cleanupControlShape,
  keyword: optionalText,
  startAt: optionalDate,
  endAt: optionalDate,
  userId: optionalPositiveInteger,
  actorKind: z.enum(['admin', 'user']).optional(),
  actor: optionalText,
  action: optionalText,
  resourceType: optionalText,
  status: z.enum(['success', 'failure']).optional()
}).strict().superRefine(addCleanupValidation)
