import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readRequiredQueryPositiveInteger } from '~~/server/utils/request-query'

export default defineAdminEventHandler((event) => {
  const { query, limit, offset } = readPaginationQuery(event)
  const messageId = readRequiredQueryPositiveInteger(query, 'messageId')

  return notificationService.getMessageDetail(messageId, { limit, offset })
})
