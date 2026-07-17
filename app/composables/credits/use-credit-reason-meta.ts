import type { CreditReason } from '#shared/types/credit-reason'

type CreditReasonColor = 'success' | 'error' | 'warning' | 'info' | 'neutral'

interface CreditReasonMeta {
  color: CreditReasonColor
  messageKey: string
}

const CREDIT_REASON_META: Record<CreditReason, CreditReasonMeta> = {
  admin_grant: { color: 'success', messageKey: 'common.credits.reasons.adminGrant' },
  admin_revoke: { color: 'error', messageKey: 'common.credits.reasons.adminRevoke' },
  admin_reset: { color: 'warning', messageKey: 'common.credits.reasons.adminReset' },
  api_charge: { color: 'error', messageKey: 'common.credits.reasons.apiCharge' },
  api_refund: { color: 'success', messageKey: 'common.credits.reasons.apiRefund' },
  signup_bonus: { color: 'info', messageKey: 'common.credits.reasons.signupBonus' },
  redemption_code: { color: 'success', messageKey: 'common.credits.reasons.redemptionCode' },
  checkin: { color: 'success', messageKey: 'common.credits.reasons.checkin' }
}

export function useCreditReasonMeta() {
  const { t } = useI18n()

  function getReasonLabel(reason: string): string {
    const meta = CREDIT_REASON_META[reason as CreditReason]
    return meta ? t(meta.messageKey) : reason
  }

  function getReasonColor(reason: string): CreditReasonColor {
    return CREDIT_REASON_META[reason as CreditReason]?.color ?? 'neutral'
  }

  return {
    getReasonColor,
    getReasonLabel
  }
}
