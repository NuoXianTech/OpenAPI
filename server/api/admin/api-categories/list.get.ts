import type { H3Event } from 'h3'
import { apiCategoryService } from '~~/server/services/api-category-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event: H3Event) => {
  const data = await apiCategoryService.listAll()
  return data
})
