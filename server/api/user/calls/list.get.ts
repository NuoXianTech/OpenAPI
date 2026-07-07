import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/services/api-call-service'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryNumber, readQueryOption, readQueryText } from '~~/server/utils/request-query'

const CALL_STATUSES = ['success', 'failure'] as const

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { query, limit, offset } = readPaginationQuery(event)
  const apiId = readQueryNumber(query.apiId)
  const apiKeyId = readQueryNumber(query.apiKeyId)
  const status = readQueryOption(query.status, CALL_STATUSES)
  const keyword = readQueryText(query.keyword)

  const data = await apiCallService.listLogForUser(user.id, { keyword, apiId, apiKeyId, status, limit, offset })
  return data
})
