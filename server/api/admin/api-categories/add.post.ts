import { adminCreateApiCategorySchema } from '~~/server/schemas/admin'
import { apiCategoryService } from '~~/server/services/api-category-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateApiCategorySchema)

  const created = await apiCategoryService.create({
    code: body.code,
    name: body.name,
    description: body.description?.trim() || null,
    icon: body.icon?.trim() || null,
    color: body.color?.trim() || null,
    parentId: body.parentId ?? null,
    sortOrder: body.sortOrder ?? 0,
    isEnabled: body.isEnabled ?? true
  })

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.api-category.create',
    resourceType: 'api-category',
    resourceId: created?.id,
    detail: { code: body.code, name: body.name }
  })

  return created
})
