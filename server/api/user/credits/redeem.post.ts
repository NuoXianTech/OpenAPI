import { createError } from 'h3'
import { userRedeemCodeSchema } from '~~/server/schemas/user'
import { isRedemptionError, redemptionService } from '~~/server/services/redemption-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'
import { readZodBody } from '~~/server/utils/zod'
import { readClientIp } from '~~/server/utils/request-meta'

const REDEEM_ERROR_STATUS: Record<string, number> = {
  INVALID_CODE: 400,
  NOT_FOUND: 404,
  DISABLED: 403,
  EXPIRED: 410,
  USED_UP: 410,
  ALREADY_REDEEMED: 409,
  USER_NOT_FOUND: 404
}

export default defineAuthenticatedEventHandler(async (event, user) => {
  const { code } = await readZodBody(event, userRedeemCodeSchema)

  const ip = readClientIp(event)

  try {
    const data = await redemptionService.redeem({ userId: user.id, code, ip })
    await addRequestOperationLog(event, {
      userId: user.id,
      actor: user.username,
      action: 'user.redemption-code.redeem',
      resourceType: 'redemption-code',
      resourceId: data.codeId,
      detail: { amount: data.amount, batchId: data.batchId }
    })
    return data
  } catch (err) {
    if (isRedemptionError(err)) {
      const status = REDEEM_ERROR_STATUS[err.code] || 400
      throw createError({
        statusCode: status,
        message: err.message,
        data: { errorCode: err.code }
      })
    }
    console.error('redeem failed', err)
    throw createError({ statusCode: 500, message: '兑换失败，请稍后再试' })
  }
})
