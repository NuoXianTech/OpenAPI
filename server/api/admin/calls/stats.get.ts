import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { apiCallStatsService } from '~~/server/service/apiCallStatsService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await apiCallStatsService.list()
  const total = list.reduce((sum: number, item: { totalCount: number }) => sum + item.totalCount, 0)
  const success = list.reduce((sum: number, item: { successCount: number }) => sum + item.successCount, 0)
  const failure = list.reduce((sum: number, item: { failureCount: number }) => sum + item.failureCount, 0)

  return { code: 0, msg: 'ok', data: { total, success, failure, items: list } }
})
