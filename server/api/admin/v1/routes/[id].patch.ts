import { adminRouteSchema } from '~~/server/schemas/admin'
import { platformRouteService } from '~~/server/services/platform-route-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformRoute } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const routeId = readUuidRouterParam(event)

  const body = await readZodBody(event, adminRouteSchema)
  const result = await platformRouteService.updateAndPublish(
    routeId,
    body,
    admin.id
  )
  const updated = result.route
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.route.update',
    resourceType: 'api-route',
    resourceId: updated.id,
    detail: { method: updated.method, pathPattern: updated.pathPattern, state: updated.state }
  })
  return {
    ...toPlatformRoute(updated),
    revisions: result.revisions
  }
})
