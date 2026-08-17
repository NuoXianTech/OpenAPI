import { adminCreateTargetSchema } from '~~/server/schemas/admin'
import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const upstreamId = readUuidRouterParam(event)
  const body = await readZodBody(event, adminCreateTargetSchema)
  const created = await platformUpstreamService.createTarget(upstreamId, body)
  if (created.publishRouting) {
    await routingRevisionService.publishWorkspace(created.workspaceId, admin.id)
  }
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.target.create',
    resourceType: 'upstream-target',
    resourceId: created.target.id,
    detail: { upstreamId, baseUrl: created.target.baseUrl }
  })
  return created.target
})
