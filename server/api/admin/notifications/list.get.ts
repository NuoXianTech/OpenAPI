import { MESSAGE_LEVELS } from '#shared/types/content'
import { notificationService } from '~~/server/services/notification-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryOption, readQueryText } from '~~/server/utils/request-query'

const NOTIFICATION_AUDIENCES = ['specific', 'all_current', 'all_with_future'] as const

export default defineAdminEventHandler((event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })

  return notificationService.listMessagesForAdmin({
    keyword: readQueryText(query.keyword),
    audience: readQueryOption(query.audience, NOTIFICATION_AUDIENCES),
    level: readQueryOption(query.level, MESSAGE_LEVELS),
    limit,
    offset
  })
})
