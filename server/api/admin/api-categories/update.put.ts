import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { adminUpdateApiCategorySchema } from '#shared/schemas/admin'
import { apiCategoryService } from '~~/server/service/apiCategoryService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
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

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.api-category.update',
    resourceType: 'api-category',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { patch }
  })

  return updated
})
