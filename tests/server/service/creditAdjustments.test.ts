import { describe, expect, it } from 'vitest'
import {
  calculateAdminRevokeAdjustment,
  getAdminCreditReason,
  normalizeCreditAmount
} from '~~/server/service/creditAdjustments'

describe('normalizeCreditAmount', () => {
  it('truncates and clamps positive amounts', () => {
    expect(normalizeCreditAmount(12.9)).toBe(12)
    expect(normalizeCreditAmount(-2)).toBe(0)
  })
})

describe('calculateAdminRevokeAdjustment', () => {
  it('deducts only the available balance and never goes negative', () => {
    expect(calculateAdminRevokeAdjustment({ currentCredits: 5, requestedAmount: 8 })).toEqual({
      deductedAmount: 5,
      balanceAfter: 0,
      transactionAmount: -5
    })
  })

  it('records a zero transaction when the balance is already zero', () => {
    expect(calculateAdminRevokeAdjustment({ currentCredits: 0, requestedAmount: 8 })).toEqual({
      deductedAmount: 0,
      balanceAfter: 0,
      transactionAmount: 0
    })
  })
})

describe('getAdminCreditReason', () => {
  it('maps admin operations to transaction reasons', () => {
    expect(getAdminCreditReason('grant')).toBe('admin_grant')
    expect(getAdminCreditReason('revoke')).toBe('admin_revoke')
    expect(getAdminCreditReason('reset')).toBe('admin_reset')
  })
})
