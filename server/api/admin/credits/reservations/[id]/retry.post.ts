import { createError } from 'h3'
import { creditService } from '~~/server/services/credit-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPositiveIntegerRouterParam } from '~~/server/utils/router-param'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readPositiveIntegerRouterParam(event)
  const reservation = await creditService.retryCreditReservation(id)
  if (!reservation) {
    throw createError({ statusCode: 404, message: '待处理计费预留不存在或状态已变化' })
  }
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.credit-reservation.retry',
    resourceType: 'credit-reservation',
    resourceId: id,
    detail: { previousStatus: 'dead_letter' }
  })
  return reservation
})
