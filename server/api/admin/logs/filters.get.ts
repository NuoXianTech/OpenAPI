import type { H3Event } from 'h3'
import { adminLogsService } from '~~/server/service/adminLogsService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  return adminLogsService.listFilterOptions()
})
