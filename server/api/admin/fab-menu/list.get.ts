import type { H3Event } from 'h3'
import { fabMenuService } from '~~/server/service/fabMenuService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const list = await fabMenuService.list(false)

  return {
    code: 0,
    msg: 'ok',
    data: list,
  }
})