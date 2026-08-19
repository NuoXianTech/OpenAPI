import { adminCreateEnvironmentSchema } from '~~/server/schemas/admin'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateEnvironmentSchema)
  const result = await platformWorkspaceService.createEnvironmentAndPublish(
    body,
    admin.id
  )
  const created = result.environment
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.environment.create',
    resourceType: 'environment',
    resourceId: created.id,
    detail: { workspaceId: created.workspaceId, slug: created.slug }
  })
  return {
    ...created,
    revisions: result.revisions
  }
})
