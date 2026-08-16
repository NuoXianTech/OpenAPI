import { adminCreateEnvironmentSchema } from '~~/server/schemas/admin'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { routingRevisionService } from '~~/server/services/routing-revision-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateEnvironmentSchema)
  const created = await platformWorkspaceService.createEnvironment(body)
  await routingRevisionService.publishWorkspace(created.workspaceId, admin.id)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.environment.create',
    resourceType: 'environment',
    resourceId: created.id,
    detail: { workspaceId: created.workspaceId, slug: created.slug }
  })
  return created
})
