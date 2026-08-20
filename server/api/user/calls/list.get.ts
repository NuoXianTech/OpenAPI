import { userApiCallService } from '~~/server/services/user-api-call-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryOption, readQueryPositiveInteger, readQueryText } from '~~/server/utils/request-query'

const CALL_STATUSES = ['success', 'failure'] as const

export default defineAuthenticatedEventHandler((event, user) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })
  const routeId = readQueryText(query.routeId)
  const apiKeyId = readQueryPositiveInteger(query.apiKeyId)
  const status = readQueryOption(query.status, CALL_STATUSES)
  const keyword = readQueryText(query.keyword)

  return userApiCallService.list(user.id, { keyword, routeId, apiKeyId, status, limit, offset })
})
