import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event: H3Event) => {
  const messageId = readRequiredQueryNumber(getQuery(event), 'messageId')

  return notificationService.getMessageDetail(messageId)
})
