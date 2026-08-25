import { adminUpdateRuntimeSchema } from '~~/server/schemas/admin'
import { platformRuntimeService } from '~~/server/services/platform-runtime-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { toPlatformRuntime } from '~~/server/utils/platform-view'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminUpdateRuntimeSchema)
  const result = await platformRuntimeService.updateDefaultDomain(
    body.defaultDomain,
    admin.id
  )
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.platform.runtime.update',
    resourceType: 'platform-runtime',
    resourceId: 'runtime',
    detail: {
      defaultDomain: result.runtime.defaultDomain,
      revisionId: result.revision?.id ?? null,
      revisionSequence: result.revision?.sequence ?? null
    }
  })
  return {
    ...toPlatformRuntime(result.runtime),
    revision: result.revision
  }
})
