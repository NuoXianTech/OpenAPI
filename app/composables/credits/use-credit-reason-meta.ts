import type { CreditReason } from '#shared/types/credit-reason'

type CreditReasonColor = 'success' | 'error' | 'warning' | 'info' | 'neutral'

const CREDIT_REASON_COLORS: Record<CreditReason, CreditReasonColor> = {
  admin_grant: 'success',
  admin_revoke: 'error',
  admin_reset: 'warning',
  api_charge: 'error',
  api_refund: 'success',
  signup_bonus: 'info',
  redemption_code: 'success',
  checkin: 'success'
}

const CREDIT_REASON_MESSAGE_KEYS = {
  admin_grant: 'common.credits.reasons.adminGrant',
  admin_revoke: 'common.credits.reasons.adminRevoke',
  admin_reset: 'common.credits.reasons.adminReset',
  api_charge: 'common.credits.reasons.apiCharge',
  api_refund: 'common.credits.reasons.apiRefund',
  signup_bonus: 'common.credits.reasons.signupBonus',
  redemption_code: 'common.credits.reasons.redemptionCode',
  checkin: 'common.credits.reasons.checkin'
} as const satisfies Record<CreditReason, string>

export function useCreditReasonMeta() {
  const { t } = useI18n()

  function getReasonLabel(reason: string): string {
    const messageKey = CREDIT_REASON_MESSAGE_KEYS[reason as CreditReason]
    return messageKey ? t(messageKey) : reason
  }

  function getReasonColor(reason: string): CreditReasonColor {
    return CREDIT_REASON_COLORS[reason as CreditReason] ?? 'neutral'
  }

  return {
    getReasonColor,
    getReasonLabel
  }
}
