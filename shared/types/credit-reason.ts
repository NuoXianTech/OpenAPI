/**
 * 积分流水原因（credit_transactions.reason）的单一事实来源：
 * 枚举 + 中文展示元数据（标签 + Badge 颜色）。
 *
 * 写入端见 server/services/credit-service.ts（直接复用此枚举）；
 * 管理端 / 用户端的列表、汇总、筛选统一引用这里，避免标签 / 配色各处重复且漂移。
 */

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

/** 列表筛选用：在落库原因之上叠加“全部”哨兵 */
export type CreditReasonFilter = CreditReason | 'all'

export interface CreditReasonMeta {
  label: string
  color: 'success' | 'error' | 'warning' | 'info' | 'neutral'
}

export const CREDIT_REASON_META: Record<CreditReason, CreditReasonMeta> = {
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
