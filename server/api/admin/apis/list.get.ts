import type { H3Event } from 'h3'
import { getQuery } from 'h3'
import { apiService } from '~~/server/service/apiService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const list = await apiService.list({
    keyword: (query.keyword || '').toString().trim(),
    status: query.status !== undefined ? Number(query.status) : undefined,
    isEnabled: query.isEnabled !== undefined ? query.isEnabled === 'true' : undefined,
    isStatistics: query.isStatistics !== undefined ? query.isStatistics === 'true' : undefined,
  })
  return { code: 0, msg: 'ok', data: list }
})
