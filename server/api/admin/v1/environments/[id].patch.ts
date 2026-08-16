import { adminUpdateEnvironmentSchema } from '~~/server/schemas/admin'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateEnvironmentSchema)
  const updated = await platformWorkspaceService.updateEnvironment(id, body)
  await routingRevisionService.publishWorkspace(updated.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.environment.update',
    resourceType: 'environment',
    resourceId: id,
    detail: { patch: body }
  })
  return updated
})
