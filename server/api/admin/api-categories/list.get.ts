import type { H3Event } from 'h3'
import { apiCategoryService } from '~~/server/services/api-category-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler((_event: H3Event) => {
  return apiCategoryService.listAll()
})
