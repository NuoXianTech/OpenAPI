import { z } from 'zod'
import { messageLevelSchema } from '../message-level'
import { requiredString } from '../validation'

export const adminCreateAnnouncementSchema = z.object({
  title: requiredString('公告标题'),
  content: requiredString('公告内容', { trim: false }),
  level: messageLevelSchema.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  linkUrl: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional()
})

export const adminUpdateAnnouncementSchema = z.object({
  id: z.coerce.number().int().positive('公告 ID 必填'),
  title: z.string().trim().optional(),
  content: z.string().optional(),
  level: messageLevelSchema.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  linkUrl: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional()
})

export const adminCreateFriendLinkSchema = z.object({
  title: requiredString('链接标题'),
  url: requiredString('链接地址'),
  description: z.string().optional(),
  isActive: z.boolean().default(true)
})

export const adminUpdateFriendLinkSchema = z.object({
  id: z.coerce.number().int().positive('友情链接 ID 必填'),
  title: z.string().trim().optional(),
  url: z.string().trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})
