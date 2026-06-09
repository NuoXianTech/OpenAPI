import { z } from 'zod'

/** 单个 id 入参，常见于 delete / reset / toggle */
export const idSchema = z.object({
  id: z.coerce.number().int().positive('id is required')
})

/** messageId 入参 */
export const messageIdSchema = z.object({
  messageId: z.coerce.number().int().positive('messageId is required')
})

/**
 * 把 string/number/Date/null/空串 解析成 Date | null；undefined 透传。
 * 用于 bannedUntil / expiresAt 等可空日期字段。
 */
export const optionalDate = z.preprocess(
  (v) => {
    if (v === undefined) return undefined
    if (v === null || v === '') return null
    const d = new Date(typeof v === 'string' || typeof v === 'number' || v instanceof Date ? v : String(v))
    return Number.isNaN(d.getTime()) ? null : d
  },
  z.union([z.date(), z.null()]).optional()
)
