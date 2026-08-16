import { describe, expect, it } from 'vitest'
import {
  getAdminCreditReason,
  normalizeCreditAmount
} from '~~/server/services/credit-adjustments'

describe('credit adjustment helpers', () => {
  it('normalizes amounts and maps admin reasons', () => {
    expect(normalizeCreditAmount(12.9)).toBe(12)
    expect(normalizeCreditAmount(-2)).toBe(0)

    expect(getAdminCreditReason('grant')).toBe('admin_grant')
    expect(getAdminCreditReason('revoke')).toBe('admin_revoke')
    expect(getAdminCreditReason('reset')).toBe('admin_reset')
  })
})
