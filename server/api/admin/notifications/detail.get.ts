import { getQuery } from 'h3'
import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const messageId = readRequiredQueryNumber(getQuery(event), 'messageId')

  return notificationService.getMessageDetail(messageId)
})
