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

  const updated = await fabMenuService.update(id, admin.id || null, {
    title: body.title?.toString().trim(),
    subtitle: body.subtitle === '' ? null : body.subtitle?.toString().trim(),
    icon: body.icon?.toString().trim(),
    actionType: body.actionType,
    actionValue: body.actionValue?.toString().trim(),
    actionLabel: body.actionLabel?.toString().trim(),
    target: body.target?.toString().trim(),
    sort: body.sort !== undefined ? Number(body.sort) : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.fab-menu.update',
    resourceType: 'fab-menu',
    resourceId: String(id),
    detail: JSON.stringify(updated),
  })

  return { code: 0, msg: 'ok', data: updated }
})