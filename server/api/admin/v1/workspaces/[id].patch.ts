import { adminUpdateWorkspaceSchema } from '~~/server/schemas/admin'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformWorkspaceSummary } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateWorkspaceSchema)
  const updated = await platformWorkspaceService.update(id, body)
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.workspace.update',
    resourceType: 'workspace',
    resourceId: id,
    detail: { patch: body }
  })
  return toPlatformWorkspaceSummary(updated)
})
