import { apiCategoryService } from '~~/server/services/api-category-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(() => apiCategoryService.listAll())
