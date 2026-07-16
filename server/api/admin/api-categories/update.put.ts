import { createError } from 'h3'
import { adminUpdateApiCategorySchema } from '~~/server/schemas/admin'
import { apiCategoryService } from '~~/server/services/api-category-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/request-meta'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id, name, description, icon, color, parentId, sortOrder, isEnabled } = await readZodBody(event, adminUpdateApiCategorySchema)

  const patch: Record<string, unknown> = {}
  if (name !== undefined) patch.name = name
  if (description !== undefined) patch.description = description || null
  if (icon !== undefined) patch.icon = icon || null
  if (color !== undefined) patch.color = color || null
  if (parentId !== undefined) patch.parentId = parentId
  if (sortOrder !== undefined) patch.sortOrder = sortOrder
  if (isEnabled !== undefined) patch.isEnabled = isEnabled

  const updated = await apiCategoryService.update(id, patch)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'category not found' })
  }

  await operationLogService.addRequestLog(event, {
    actor: admin.username,
    action: 'admin.api-category.update',
    resourceType: 'api-category',
    resourceId: id,
    ...readRequestMeta(event),
    detail: { patch }
  })

  return updated
})
