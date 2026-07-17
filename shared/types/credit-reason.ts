/** 落库的积分变动原因（不含筛选用的 'all' 哨兵） */
export type CreditReason
  = | 'admin_grant' // 管理员加积分
    | 'admin_revoke' // 管理员扣积分
    | 'admin_reset' // 管理员重置积分
    | 'api_charge' // API 调用扣费
    | 'api_refund' // API 调用退款
    | 'signup_bonus' // 注册赠送
    | 'redemption_code' // 兑换码兑换
    | 'checkin' // 每日签到

export type CreditReasonFilter = CreditReason | 'all'

interface CreditReasonMeta {
  color: 'success' | 'error' | 'warning' | 'info' | 'neutral'
}

const CREDIT_REASON_META: Record<CreditReason, CreditReasonMeta> = {
  admin_grant: { color: 'success' },
  admin_revoke: { color: 'error' },
  admin_reset: { color: 'warning' },
  api_charge: { color: 'error' },
  api_refund: { color: 'success' },
  signup_bonus: { color: 'info' },
  redemption_code: { color: 'success' },
  checkin: { color: 'success' }
}

export function creditReasonColor(reason: string): CreditReasonMeta['color'] {
  return CREDIT_REASON_META[reason as CreditReason]?.color ?? 'neutral'
}
