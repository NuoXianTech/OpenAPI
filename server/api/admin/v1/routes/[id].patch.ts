import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { adminRouteSchema } from '~~/server/schemas/admin'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const routeId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!routeId.success) throw createError({ statusCode: 400, message: 'route id is invalid' })

  const body = await readZodBody(event, adminRouteSchema)
  const updated = await platformRouteService.update(routeId.data, body)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.route.update',
    resourceType: 'api-route',
    resourceId: updated.id,
    detail: { method: updated.method, pathPattern: updated.pathPattern, state: updated.state }
  })
  return updated
})
