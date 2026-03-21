import type { H3Event } from 'h3'
import { createError } from 'h3'
import { fabMenuService } from '~~/server/service/fabMenuService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const id = Number(body.id)
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const deleted = await fabMenuService.delete(id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'fab menu item not found' })
  }

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.fab-menu.delete',
    resourceType: 'fab-menu',
    resourceId: String(id),
    detail: JSON.stringify(deleted),
  })

  return { code: 0, msg: 'ok', data: deleted }
})