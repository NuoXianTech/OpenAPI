import type { H3Event } from 'h3'
import { createError } from 'h3'
import { fabMenuService } from '~~/server/service/fabMenuService'
import { requireAdmin } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/service/operationLogService'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
  const body = await readBody(event) as Record<string, any>
  const title = (body.title || '').toString().trim()
  const actionValue = (body.actionValue || '').toString().trim()

  if (!title || !actionValue) {
    throw createError({ statusCode: 400, message: 'title and actionValue are required' })
  }

  const created = await fabMenuService.create(admin.id || null, {
    title,
    subtitle: body.subtitle?.toString().trim() || null,
    icon: body.icon?.toString().trim() || 'mdi:link-variant',
    actionType: body.actionType,
    actionValue,
    actionLabel: body.actionLabel?.toString().trim() || '打开',
    target: body.target?.toString().trim() || '_blank',
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  })

  await operationLogService.addLog({
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.fab-menu.create',
    resourceType: 'fab-menu',
    resourceId: String(created?.id || ''),
    detail: { created },
  })

  return { code: 0, msg: 'ok', data: created }
})
