import type { CreditReason } from '#shared/types/credit-reason'

/** 列表筛选用：在落库原因之上叠加“全部”哨兵 */
export type CreditReasonFilter = CreditReason | 'all'

export interface CreditReasonMeta {
  label: string
  color: 'success' | 'error' | 'warning' | 'info' | 'neutral'
}

const CREDIT_REASON_META: Record<CreditReason, CreditReasonMeta> = {
  admin_grant: { label: '管理员加', color: 'success' },
  admin_revoke: { label: '管理员扣', color: 'error' },
  admin_reset: { label: '管理员重置', color: 'warning' },
  api_charge: { label: 'API 扣费', color: 'error' },
  api_refund: { label: 'API 退款', color: 'success' },
  signup_bonus: { label: '注册赠送', color: 'info' },
  redemption_code: { label: '兑换码', color: 'success' },
  checkin: { label: '每日签到', color: 'success' }
}

export function creditReasonLabel(reason: string): string {
  return CREDIT_REASON_META[reason as CreditReason]?.label ?? reason
}

export function creditReasonColor(reason: string): CreditReasonMeta['color'] {
  return CREDIT_REASON_META[reason as CreditReason]?.color ?? 'neutral'
}
