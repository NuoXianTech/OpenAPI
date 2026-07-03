/**
 * 登录日志 · 共享类型与展示元数据
 *
 * 数据源 `login_logs` 表（server/db/schema/system.ts），只记录「已识别用户」的
 * 登录尝试（成功 + 失败）。写入由 server/services/login-log-service.ts 完成，
 * 已接入密码登录（auth/login.post.ts）与 OAuth 回调（utils/oauth-callback.ts）。
 *
 * 这里集中：
 *   - LoginMethod / LoginFailureReason 枚举（server service 复用同一份）
 *   - 列表行类型（user 端「最近登录活动」/ admin 端登录日志）
 *   - 登录方式、失败原因的中文展示映射，前后端共用
 */

// ── 枚举 ────────────────────────────────────────────────────────────
export type LoginMethod = 'password' | 'oauth_github' | 'oauth_qq'

export type LoginFailureReason
  = | 'invalid_password' // 密码错误
    | 'banned' // 账号已被封禁
    | 'not_active' // 账号未激活（邮箱未验证）
    | 'oauth_user_unavailable' // OAuth 命中的账号已被删除 / 不可用

// ── 列表行 ──────────────────────────────────────────────────────────

/** 用户端「最近登录活动」单行：只含本人数据，不含用户名 */
export interface LoginLogRow {
  id: number
  /** 正常为 LoginMethod；留 string 兜底历史 / 未知值 */
  method: string
  success: boolean
  failureReason: string | null
  ip: string | null
  /** server 端用 bowser 解析出的设备概要，如 "Chrome · Windows" */
  device: string
  /** 完整 UA 原文（admin 备查；user 端通常不展示） */
  userAgent: string | null
  /** ISO 字符串 */
  createdAt: string
}

/** 管理后台登录日志行 = 用户端行 + 用户标识 */
export interface AdminLoginLogRow extends LoginLogRow {
  userId: number
  username: string | null
}

// ── 展示元数据（前后端共用）────────────────────────────────────────
type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const LOGIN_METHOD_META: Record<LoginMethod, { label: string, icon: string, color: BadgeColor }> = {
  password: { label: '账号密码', icon: 'i-mdi-form-textbox-password', color: 'neutral' },
  oauth_github: { label: 'GitHub', icon: 'i-mdi-github', color: 'neutral' },
  oauth_qq: { label: 'QQ', icon: 'i-mdi-qqchat', color: 'info' }
}

/** method 值 → 中文标签；未知值原样返回 */
export function loginMethodLabel(method: string): string {
  return LOGIN_METHOD_META[method as LoginMethod]?.label ?? method
}

const LOGIN_FAILURE_REASON_LABELS: Record<LoginFailureReason, string> = {
  invalid_password: '密码错误',
  banned: '账号被封禁',
  not_active: '邮箱未验证',
  oauth_user_unavailable: '账号不可用'
}

/** 失败原因 → 中文；未知值原样返回；null / 空 → 「失败」 */
export function loginFailureReasonLabel(reason: string | null): string {
  if (!reason) return '失败'
  return LOGIN_FAILURE_REASON_LABELS[reason as LoginFailureReason] ?? reason
}
