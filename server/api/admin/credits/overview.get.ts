import type { H3Event } from 'h3'
import { adminCreditReportService } from '~~/server/services/admin-credit-report-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  return adminCreditReportService.getOverview()
})
