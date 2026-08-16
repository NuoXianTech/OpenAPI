import { creditService, type CreditReservationStatus } from '~~/server/services/credit-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryOption } from '~~/server/utils/request-query'

const STATUSES: CreditReservationStatus[] = ['active', 'pending', 'dead_letter']

export default defineAdminEventHandler((event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })
  return creditService.listCreditReservations({
    status: readQueryOption(query.status, STATUSES),
    limit,
    offset
  })
})
