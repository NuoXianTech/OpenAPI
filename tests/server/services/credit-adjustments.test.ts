import { describe, expect, it } from 'vitest'
import {
  calculateAdminRevokeAdjustment,
  getAdminCreditReason,
  normalizeCreditAmount
} from '~~/server/service/creditAdjustments'

describe('credit adjustment helpers', () => {
  it('normalizes amounts, calculates revokes, and maps admin reasons', () => {
    expect(normalizeCreditAmount(12.9)).toBe(12)
    expect(normalizeCreditAmount(-2)).toBe(0)

    expect(calculateAdminRevokeAdjustment({ currentCredits: 5, requestedAmount: 8 })).toEqual({
      deductedAmount: 5,
      balanceAfter: 0,
      transactionAmount: -5
    })
    expect(calculateAdminRevokeAdjustment({ currentCredits: 0, requestedAmount: 8 })).toEqual({
      deductedAmount: 0,
      balanceAfter: 0,
      transactionAmount: 0
    })

    expect(getAdminCreditReason('grant')).toBe('admin_grant')
    expect(getAdminCreditReason('revoke')).toBe('admin_revoke')
    expect(getAdminCreditReason('reset')).toBe('admin_reset')
  })
})
