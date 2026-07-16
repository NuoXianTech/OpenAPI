import { createError } from 'h3'
import { idSchema } from '~~/server/schemas/common'
import { apiService } from '~~/server/services/api-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { operationLogService } from '~~/server/services/operation-log-service'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const { id } = await readZodBody(event, idSchema)

  let deleted: Awaited<ReturnType<typeof apiService.deleteApi>>
  try {
    deleted = await apiService.deleteApi(id)
  } catch (err) {
    // apiCalls.apiId restrict 阻止删除：接口有历史调用日志，不允许真删（保留日志可 join 到接口名）
    throw createError({ statusCode: 409, message: (err as Error).message })
  }
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'api not found' })
  }

  await operationLogService.addRequestLog(event, {
    userId: admin.id || null,
    actor: admin.username,
    action: 'admin.api.delete',
    resourceType: 'api',
    resourceId: String(id),
    detail: { deleted }
  })

  return deleted
})
