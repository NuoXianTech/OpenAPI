import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/services/redemption-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler((_event: H3Event) => {
  return redemptionService.listBatches()
})
