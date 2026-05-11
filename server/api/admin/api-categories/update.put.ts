import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { apiCategoryService } from '~~/server/service/apiCategoryService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name.toString().trim()
  if (body.description !== undefined) patch.description = body.description?.toString() || null
  if (body.icon !== undefined) patch.icon = body.icon?.toString() || null
  if (body.color !== undefined) patch.color = body.color?.toString() || null
  if (body.parentId !== undefined) patch.parentId = body.parentId ? Number(body.parentId) : null
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder)
  if (body.isEnabled !== undefined) patch.isEnabled = Boolean(body.isEnabled)

  const updated = await apiCategoryService.update(id, patch)
  if (!updated) {
    throw createError({ statusCode: 404, message: 'category not found' })
  }

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.api-category.update',
    resourceType: 'api_category',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { patch },
  })

  return updated
})
