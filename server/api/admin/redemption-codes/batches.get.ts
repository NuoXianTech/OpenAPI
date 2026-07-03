import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/services/redemption-service'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const data = await redemptionService.listBatches()
  return data
})
