import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { apiCallService } from '~~/server/service/apiCallService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)

  const userId = query.userId ? Number(query.userId) : undefined
  const apiId = query.apiId ? Number(query.apiId) : undefined
  const apiKeyId = query.apiKeyId ? Number(query.apiKeyId) : undefined
  const statusRaw = (query.status || '').toString()
  const status = statusRaw === 'success' || statusRaw === 'failure' ? statusRaw : undefined
  const limit = query.limit ? Number(query.limit) : 50
  const offset = query.offset ? Number(query.offset) : 0

  const data = await apiCallService.listForAdmin({ userId, apiId, apiKeyId, status, limit, offset })
  return data
})
