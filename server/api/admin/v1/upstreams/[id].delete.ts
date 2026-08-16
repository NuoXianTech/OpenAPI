import { platformUpstreamService } from '~~/server/services/platform-upstream-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const removed = await platformUpstreamService.remove(id)
  if (!removed) throw new Error('upstream delete returned no row')
  await routingRevisionService.publishWorkspace(removed.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.upstream.delete',
    resourceType: 'upstream-service',
    resourceId: id,
    detail: { slug: removed.slug }
  })
  return { id }
})
