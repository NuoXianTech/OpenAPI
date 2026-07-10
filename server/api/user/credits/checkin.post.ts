import type { H3Event } from 'h3'
import { createError, getRequestIP, readBody } from 'h3'
import { checkinService, isCheckinError } from '~~/server/services/checkin-service'
import { operationLogService } from '~~/server/services/operation-log-service'
import { requireAuth } from '~~/server/utils/auth'
import { assertTurnstileForPage } from '~~/server/utils/turnstile'

const CHECKIN_ERROR_STATUS: Record<string, number> = {
  DISABLED: 403,
  COOLDOWN: 429
}

export default defineEventHandler(async (event: H3Event) => {
  const user = await requireAuth(event)
  const ip = getRequestIP(event) || null
  const body = await readBody<{ turnstileToken?: string }>(event).catch(() => ({} as { turnstileToken?: string }))
  await assertTurnstileForPage('checkin', body?.turnstileToken ?? '', ip)

  try {
    const data = await checkinService.checkin(user.id)
    await operationLogService.addRequestLog(event, {
      userId: user.id,
      actor: user.username,
      action: 'user.checkin',
      resourceType: 'credit',
      resourceId: String(user.id),
      ip,
      detail: { amount: data.amount, balanceAfter: data.balanceAfter, nextCheckinAt: data.nextCheckinAt }
    })
    return data
  } catch (err) {
    if (isCheckinError(err)) {
      const status = CHECKIN_ERROR_STATUS[err.code] || 400
      throw createError({
        statusCode: status,
        message: err.message,
        data: { errorCode: err.code }
      })
    }
    console.error('checkin failed', err)
    throw createError({ statusCode: 500, message: '签到失败，请稍后再试' })
  }
})
