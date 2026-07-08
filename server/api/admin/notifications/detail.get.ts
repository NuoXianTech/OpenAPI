import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const messageId = readRequiredQueryNumber(getQuery(event), 'messageId')

  const data = await notificationService.getMessageDetail(messageId)
  return data
})
