import type { H3Event } from 'h3'
import { adminLogsService } from '~~/server/services/admin-logs-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event: H3Event) => {
  return adminLogsService.listFilterOptions()
})
