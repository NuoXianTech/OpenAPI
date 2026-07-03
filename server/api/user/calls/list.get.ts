import type { H3Event } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { requireAuth } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/requestPagination'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const { query, limit, offset } = readPaginationQuery(event)
  const apiId = query.apiId ? Number(query.apiId) : undefined
  const apiKeyId = query.apiKeyId ? Number(query.apiKeyId) : undefined
  const statusRaw = (query.status || '').toString()
  const status = statusRaw === 'success' || statusRaw === 'failure' ? statusRaw : undefined

  const data = await apiCallService.listLogForUser(user.id, { apiId, apiKeyId, status, limit, offset })
  return data
})
