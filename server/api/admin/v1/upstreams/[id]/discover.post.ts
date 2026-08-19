import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { platformServiceControlService } from '~~/server/services/platform-service-control-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!upstreamId.success) {
    throw createError({ statusCode: 400, message: 'upstream id is invalid' })
  }
  const result = await platformServiceControlService.discover(upstreamId.data)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.service.discover',
    resourceType: 'upstream-service',
    resourceId: upstreamId.data,
    detail: {
      serviceId: result.connection.serviceId,
      openapiSha256: result.connection.openapiSha256,
      endpointCount: result.endpoints.filter(endpoint => (
        !endpoint.system && !endpoint.support
      )).length
    }
  })
  return result
})
