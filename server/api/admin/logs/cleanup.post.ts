import { adminCleanupApiCallLogsSchema } from '~~/server/schemas/admin'
import { adminApiCallLogService } from '~~/server/services/admin-api-call-log-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCleanupApiCallLogsSchema)
  const { confirm: _confirm, deleteAll = false, ...filters } = body
  const affected = await adminApiCallLogService.deleteMatching(filters)

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.call-log.cleanup',
    resourceType: 'api-call-log',
    resourceId: deleteAll ? 'all' : 'filtered',
    detail: { filters, affected }
  })

  return { affected }
})
