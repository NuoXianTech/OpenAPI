import type { CreditReason } from '~~/shared/types/credit-reason'

export type AdminCreditOperation = 'grant' | 'revoke' | 'reset'

interface AdminRevokeAdjustmentInput {
  currentCredits: number
  requestedAmount: number
}

interface AdminRevokeAdjustment {
  deductedAmount: number
  balanceAfter: number
  transactionAmount: number
}

export function normalizeCreditAmount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(Math.trunc(value), 0)
}

export function calculateAdminRevokeAdjustment(input: AdminRevokeAdjustmentInput): AdminRevokeAdjustment {
  const currentCredits = normalizeCreditAmount(input.currentCredits)
  const requestedAmount = normalizeCreditAmount(input.requestedAmount)
  const deductedAmount = Math.min(currentCredits, requestedAmount)
  const balanceAfter = currentCredits - deductedAmount

  return {
    deductedAmount,
    balanceAfter,
    transactionAmount: deductedAmount === 0 ? 0 : -deductedAmount
  }
}

export function getAdminCreditReason(operation: AdminCreditOperation): CreditReason {
  const reasonByOperation: Record<AdminCreditOperation, CreditReason> = {
    grant: 'admin_grant',
    revoke: 'admin_revoke',
    reset: 'admin_reset'
  }

  return reasonByOperation[operation]
}
