import { createError } from 'h3'
import { creditService } from '~~/server/services/credit-service'
import { addRequestOperationLog } from '~~/server/utils/request-operation-log'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPositiveIntegerRouterParam } from '~~/server/utils/router-param'

export default defineAdminEventHandler(async (event, admin) => {
  const id = readPositiveIntegerRouterParam(event)
  const released = await creditService.forceReleaseCreditReservation(id)
  if (!released) {
    throw createError({ statusCode: 404, message: '待处理计费预留不存在或已处理' })
  }
  await addRequestOperationLog(event, {
    userId: admin.id,
    actor: admin.username,
    action: 'admin.credit-reservation.release',
    resourceType: 'credit-reservation',
    resourceId: id
  })
  return { released: true }
})
