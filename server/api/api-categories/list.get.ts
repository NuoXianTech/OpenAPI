import { apiCategoryService } from '~~/server/services/api-category-service'

export default defineEventHandler(() => apiCategoryService.listEnabled())
