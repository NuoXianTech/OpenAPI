import { apiCategoryService } from '~~/server/service/apiCategoryService'

export default defineEventHandler(async () => {
  const data = await apiCategoryService.listEnabled()
  return { code: 0, msg: 'ok', data }
})
