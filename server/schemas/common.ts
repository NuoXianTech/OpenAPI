import { z } from 'zod'
import { maxMessage } from './validation'
import { MESSAGE_LEVELS } from '#shared/types/content'

export const idSchema = z.object({
  id: z.coerce.number().int().positive('ID 必填')
})

export const messageIdSchema = z.object({
  messageId: z.coerce.number().int().positive('消息 ID 必填')
})

export const messageLevelSchema = z.enum(MESSAGE_LEVELS)

export const optionalDate = z.preprocess(
  (value) => {
    if (value === undefined) return undefined
    if (value === null || value === '') return null

    const date = new Date(
      typeof value === 'string' || typeof value === 'number' || value instanceof Date
        ? value
        : String(value)
    )

    return Number.isNaN(date.getTime()) ? null : date
  },
  z.union([z.date(), z.null()]).optional()
)

export const displayNameSchema = z.string().trim().max(32, maxMessage('昵称', 32))
