import type { H3Event } from 'h3'
import { fabMenuService } from '~~/server/service/fabMenuService'

export default defineEventHandler(async (_event: H3Event) => {
  const list = await fabMenuService.list(true)

  return {
    code: 0,
    msg: 'ok',
    data: list,
  }
})
