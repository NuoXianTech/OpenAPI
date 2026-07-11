import type { H3Event } from 'h3'
import {
  adminCreditReportService,
  type AdminCreditBalanceFilter
} from '~~/server/services/admin-credit-report-service'
import { defineAdminEventHandler } from '~~/server/utils/auth'
import { readPaginationQuery } from '~~/server/utils/pagination'
import { readQueryNumber, readQueryOption, readQueryText } from '~~/server/utils/request-query'

const BALANCE_FILTERS: AdminCreditBalanceFilter[] = ['all', 'positive', 'zero', 'negative']

export default defineAdminEventHandler(async (event: H3Event) => {
  const { query, limit, offset } = readPaginationQuery(event, { defaultLimit: 20 })
  const userId = readQueryNumber(query.userId)

  return adminCreditReportService.listUsers({
    keyword: readQueryText(query.keyword),
    userId: userId && Number.isInteger(userId) && userId > 0 ? userId : undefined,
    balance: readQueryOption(query.balance, BALANCE_FILTERS) ?? 'all',
    limit,
    offset
  })
})
