import type { H3Event } from 'h3'
import { adminCreditReportService } from '~~/server/services/admin-credit-report-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event: H3Event) => {
  return adminCreditReportService.getOverview()
})
