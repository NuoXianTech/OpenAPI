import type { H3Event } from 'h3'
import { adminCreateApiCategorySchema } from '#shared/schemas/admin'
import { apiCategoryService } from '~~/server/service/apiCategoryService'
import { operationLogService } from '~~/server/service/operationLogService'
import { requireAdmin } from '~~/server/utils/auth'
import { readRequestMeta } from '~~/server/utils/requestMeta'
import { readZodBody } from '~~/server/utils/zod'

export default defineEventHandler(async (event: H3Event) => {
  const admin = await requireAdmin(event)
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

  await operationLogService.addLog({
    actor: admin.username,
    action: 'admin.api-category.create',
    resourceType: 'api-category',
    resourceId: created?.id,
    ...readRequestMeta(event),
    detail: { code: body.code, name: body.name }
  })

  return created
})
