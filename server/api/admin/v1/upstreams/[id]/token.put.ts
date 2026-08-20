import { adminUpdateServiceTokenSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateServiceTokenSchema)
  const result = await platformUpstreamService.updateServiceToken(
    upstreamId,
    body.serviceToken
  )
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.service.token.update',
    resourceType: 'upstream-service',
    resourceId: upstreamId,
    detail: { updated: true }
  })
  return result
})
