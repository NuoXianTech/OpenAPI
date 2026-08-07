import { z } from 'zod'
import { messageLevelSchema } from '../common'
import { nullablePublicUrl, requiredPublicUrl, requiredString } from '../validation'

export const adminCreateAnnouncementSchema = z.object({
  title: requiredString('公告标题', { max: 200 }),
  content: requiredString('公告内容', { trim: false }),
  level: messageLevelSchema.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  linkUrl: nullablePublicUrl('公告链接'),
  sortOrder: z.coerce.number().int().optional()
})

export const adminUpdateAnnouncementSchema = z.object({
  id: z.coerce.number().int().positive('公告 ID 必填'),
  title: requiredString('公告标题', { max: 200 }).optional(),
  content: requiredString('公告内容', { trim: false }).optional(),
  level: messageLevelSchema.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  linkUrl: nullablePublicUrl('公告链接'),
  sortOrder: z.coerce.number().int().optional()
})

export const adminCreateFriendLinkSchema = z.object({
  title: requiredString('链接标题', { max: 140 }),
  url: requiredPublicUrl('链接地址'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

export const adminUpdateFriendLinkSchema = z.object({
  id: z.coerce.number().int().positive('友情链接 ID 必填'),
  title: requiredString('链接标题', { max: 140 }).optional(),
  url: requiredPublicUrl('链接地址').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})
