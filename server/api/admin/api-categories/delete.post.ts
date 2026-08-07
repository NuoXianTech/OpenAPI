import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiCategoryService } from '~~/server/services/api-category-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  const removed = await apiCategoryService.softDelete(id)
  if (!removed) {
    throw createError({ statusCode: 404, message: 'category not found' })
  }

  await addRequestOperationLog(event, {
    actor: admin.username,
    action: 'admin.api-category.delete',
    resourceType: 'api-category',
    resourceId: id,
    detail: { code: removed.code, name: removed.name }
  })

  return removed
})
