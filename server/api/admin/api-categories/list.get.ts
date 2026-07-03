import type { H3Event } from 'h3'
import { apiCategoryService } from '~~/server/services/api-category-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const data = await apiCategoryService.listAll()
  return data
})
