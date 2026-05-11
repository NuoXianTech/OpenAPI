import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP } from 'h3'
import { idSchema } from '#shared/schemas/common'
import { apiCategoryService } from '~~/server/service/apiCategoryService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const { id } = await readZodBody(event, idSchema)

  const removed = await apiCategoryService.softDelete(id)
  if (!removed) {
    throw createError({ statusCode: 404, message: 'category not found' })
  }

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.api-category.delete',
    resourceType: 'api_category',
    resourceId: id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { code: removed.code, name: removed.name },
  })

  return removed
})
