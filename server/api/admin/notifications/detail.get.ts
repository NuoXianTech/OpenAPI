import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const messageId = Number(query.messageId)
  if (!messageId) throw createError({ statusCode: 400, message: 'messageId is required' })

  const data = await notificationService.getMessageDetail(messageId)
  return data
})
