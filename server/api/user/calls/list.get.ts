import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { apiCallService } from '~~/server/service/apiCallService'
import { requireAuth } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  if (!user.id) throw createError({ statusCode: 403, message: 'admin cannot access user call logs' })

  const query = getQuery(event)
  const apiId = query.apiId ? Number(query.apiId) : undefined
  const apiKeyId = query.apiKeyId ? Number(query.apiKeyId) : undefined
  const statusRaw = (query.status || '').toString()
  const status = statusRaw === 'success' || statusRaw === 'failure' ? statusRaw : undefined
  const limit = query.limit ? Number(query.limit) : 50
  const offset = query.offset ? Number(query.offset) : 0

  const data = await apiCallService.listLogForUser(user.id, { apiId, apiKeyId, status, limit, offset })
  return data
})
