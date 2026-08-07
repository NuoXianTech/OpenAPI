import { adminCleanupLoginLogsSchema } from '~~/server/schemas/admin'
import { loginLogService } from '~~/server/services/login-log-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'

export default defineAdminEventHandler(async (event, admin) => {
  const body = await readZodBody(event, adminCleanupLoginLogsSchema)
  const { confirm: _confirm, deleteAll = false, ...filters } = body
  const affected = await loginLogService.deleteMatching(filters)

  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.login-log.cleanup',
    resourceType: 'login-log',
    resourceId: deleteAll ? 'all' : 'filtered',
    detail: { filters, affected }
  })

  return { affected }
})
