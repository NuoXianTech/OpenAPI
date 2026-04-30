import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { notificationService } from '~~/server/service/notificationService'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event) => {
  await requireAdmin(event)
  const query = getQuery(event)
  const batchId = (query.batchId || '').toString().trim()
  if (!batchId) throw createError({ statusCode: 400, message: 'batchId is required' })

  const data = await notificationService.getBatchDetail(batchId)
  return { code: 0, msg: 'ok', data }
})
