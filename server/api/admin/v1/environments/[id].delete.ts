import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const result = await platformWorkspaceService.removeEnvironmentAndPublish(
    id,
    admin.id
  )
  const removed = result.environment
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.environment.delete',
    resourceType: 'environment',
    resourceId: id,
    detail: { workspaceId: removed.workspaceId, slug: removed.slug }
  })
  return {
    id,
    revisions: result.revisions
  }
})
