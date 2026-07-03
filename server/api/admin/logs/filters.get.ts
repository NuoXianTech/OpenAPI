import type { H3Event } from 'h3'
import { adminLogsService } from '~~/server/services/admin-logs-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  return adminLogsService.listFilterOptions()
})
