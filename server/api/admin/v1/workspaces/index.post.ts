import { adminCreateWorkspaceSchema } from '~~/server/schemas/admin'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformWorkspace } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCreateWorkspaceSchema)
  const created = await platformWorkspaceService.create(body)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.workspace.create',
    resourceType: 'workspace',
    resourceId: created.id,
    detail: { slug: created.slug }
  })
  return toPlatformWorkspace(created)
})
