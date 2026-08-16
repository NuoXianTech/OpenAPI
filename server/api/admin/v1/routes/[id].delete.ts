import { createError, getRouterParam } from 'h3'
import { z } from 'zod'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const routeId = z.uuid().safeParse(getRouterParam(event, 'id'))
  if (!routeId.success) throw createError({ statusCode: 400, message: 'route id is invalid' })

  const removed = await platformRouteService.remove(routeId.data)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.route.delete',
    resourceType: 'api-route',
    resourceId: removed.id,
    detail: { method: removed.method, pathPattern: removed.pathPattern }
  })
  return { id: removed.id }
})
