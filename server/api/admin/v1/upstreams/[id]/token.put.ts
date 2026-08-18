import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { adminUpdateServiceTokenSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!upstreamId.success) {
    throw createError({ statusCode: 400, message: 'upstream id is invalid' })
  }
  const body = await readZodBody(event, adminUpdateServiceTokenSchema)
  const result = await platformUpstreamService.updateServiceToken(
    upstreamId.data,
    body.serviceToken
  )
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.service.token.update',
    resourceType: 'upstream-service',
    resourceId: upstreamId.data,
    detail: { updated: true }
  })
  return result
})
