import type { H3Event } from 'h3'
import { createError, getHeader, getRequestIP, readBody } from 'h3'
import { apiCategoryService } from '~~/server/service/apiCategoryService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>

  const code = (body.code || '').toString().trim()
  const name = (body.name || '').toString().trim()
  if (!code || !name) {
    throw createError({ statusCode: 400, message: 'code and name are required' })
  }

  const created = await apiCategoryService.create({
    code,
    name,
    description: body.description?.toString().trim() || null,
    icon: body.icon?.toString().trim() || null,
    color: body.color?.toString().trim() || null,
    parentId: body.parentId ? Number(body.parentId) : null,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
    isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : true,
  })

  await operationLogService.addLog({
    actor: admin.username,
    actorType: 'admin',
    action: 'admin.api-category.create',
    resourceType: 'api_category',
    resourceId: created?.id,
    ip: getRequestIP(event) || null,
    userAgent: getHeader(event, 'user-agent') || null,
    detail: { code, name },
  })

  return { code: 0, msg: 'ok', data: created }
})
