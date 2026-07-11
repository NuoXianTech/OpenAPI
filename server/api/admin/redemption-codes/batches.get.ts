import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/services/redemption-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'

export default defineAdminEventHandler(async (_event: H3Event) => {
  const data = await redemptionService.listBatches()
  return data
})
