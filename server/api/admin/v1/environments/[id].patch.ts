import { adminUpdateEnvironmentSchema } from '~~/server/schemas/admin'
import { platformWorkspaceService } from '~~/server/services/platform-workspace-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { readUuidRouterParam } from '~~/server/utils/router-param'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformEnvironment } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readUuidRouterParam(event)
  const body = await readZodBody(event, adminUpdateEnvironmentSchema)
  const result = await platformWorkspaceService.updateEnvironmentAndPublish(
    id,
    body,
    admin.id
  )
  const updated = result.environment
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.environment.update',
    resourceType: 'environment',
    resourceId: id,
    detail: { patch: body }
  })
  return {
    ...toPlatformEnvironment(updated),
    revisions: result.revisions
  }
})
