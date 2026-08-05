import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readRequiredQueryNumber } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const { query, limit, offset } = readPaginationQuery(event)
  const messageId = readRequiredQueryNumber(query, 'messageId')

  return notificationService.getMessageDetail(messageId, { limit, offset })
})
