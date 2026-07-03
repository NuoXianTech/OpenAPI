import { z } from 'zod'
import { messageLevelSchema } from '../message-level'

export const adminCreateAnnouncementSchema = z.object({
  title: z.string().trim().min(1, 'title and content are required'),
  content: z.string().min(1, 'title and content are required'),
  level: messageLevelSchema.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  linkUrl: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional()
})

export const adminUpdateAnnouncementSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  title: z.string().trim().optional(),
  content: z.string().optional(),
  level: messageLevelSchema.catch('info').optional(),
  isPinned: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  linkUrl: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().optional()
})

export const adminCreateFriendLinkSchema = z.object({
  title: z.string().trim().min(1, 'title and url are required'),
  url: z.string().trim().min(1, 'title and url are required'),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})

export const adminUpdateFriendLinkSchema = z.object({
  id: z.coerce.number().int().positive('id is required'),
  title: z.string().trim().optional(),
  url: z.string().trim().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})
