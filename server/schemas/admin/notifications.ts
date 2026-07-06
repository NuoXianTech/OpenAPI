import { z } from 'zod'
import { messageLevelSchema } from '../message-level'

const notificationAudience = z.enum(['specific', 'all_current', 'all_with_future'])

export const adminSendNotificationSchema = z.object({
  audience: notificationAudience.catch('specific').optional(),
  recipientUserIds: z.array(z.coerce.number().int().positive()).optional(),
  title: z.string().trim().min(1, 'title 与 content 必填').max(200, 'title 过长（最多 200 字）'),
  content: z.string().min(1, 'title 与 content 必填'),
  level: messageLevelSchema.catch('info').optional(),
  linkUrl: z.string().nullable().optional()
})
