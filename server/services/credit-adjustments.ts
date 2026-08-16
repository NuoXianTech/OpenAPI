import type { CreditReason } from '#shared/types/credit-reason'

export type AdminCreditOperation = 'grant' | 'revoke' | 'reset'

export function normalizeCreditAmount(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(Math.trunc(value), 0)
}

export function getAdminCreditReason(operation: AdminCreditOperation): CreditReason {
  const reasonByOperation: Record<AdminCreditOperation, CreditReason> = {
    grant: 'admin_grant',
    revoke: 'admin_revoke',
    reset: 'admin_reset'
  }

  return reasonByOperation[operation]
}
