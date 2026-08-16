import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { adminUpdateServiceConfigurationSchema } from '~~/server/schemas/service-control'
import { platformServiceControlService } from '~~/server/services/platform-service-control-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!upstreamId.success) {
    throw createError({ statusCode: 400, message: 'upstream id is invalid' })
  }
  const body = await readZodBody(
    event,
    adminUpdateServiceConfigurationSchema
  )
  const result = await platformServiceControlService.updateConfiguration(
    upstreamId.data,
    body
  )
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.service.configuration.update',
    resourceType: 'upstream-service',
    resourceId: upstreamId.data,
    detail: {
      revision: result.revision,
      status: result.status,
      targetCount: result.targets.length
    }
  })
  return result
})
