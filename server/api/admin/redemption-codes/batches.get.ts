import type { H3Event } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const data = await redemptionService.listBatches()
  return { code: 0, msg: 'ok', data }
})
