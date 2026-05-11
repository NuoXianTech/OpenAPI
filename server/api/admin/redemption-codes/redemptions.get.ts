import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { redemptionService } from '~~/server/service/redemptionService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const codeId = Number(query.codeId) || 0
  if (!codeId) throw createError({ statusCode: 400, message: 'codeId 必填' })

  const data = await redemptionService.listCodeRedemptions(codeId)
  return data
})
