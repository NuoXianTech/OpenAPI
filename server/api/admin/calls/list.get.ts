import type { H3Event } from 'h3'
import { requireAdmin } from '~~/server/utils/auth'
import { apiCallService } from '~~/server/service/apiCallService'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await apiCallService.list()
  return { code: 0, msg: 'ok', data: list }
})
