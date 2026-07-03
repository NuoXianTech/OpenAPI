import { apiCategoryService } from '~~/server/services/api-category-service'

export default defineEventHandler(async () => {
  const data = await apiCategoryService.listEnabled()
  return data
})
