import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { apiCallService } from '~~/server/service/apiCallService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await apiCallService.list()
  const total = list.length
  const success = list.filter((item: { statusCode: number }) => item.statusCode >= 200 && item.statusCode < 400).length
  const failure = total - success

  return { code: 0, msg: 'ok', data: { total, success, failure } }
})
