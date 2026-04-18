import type { H3Event } from 'h3'
import { apiCategoryService } from '~~/server/service/apiCategoryService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const data = await apiCategoryService.listAll()
  return { code: 0, msg: 'ok', data }
})
