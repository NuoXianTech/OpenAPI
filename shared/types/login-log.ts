/**
 * 登录日志共享契约。
 *
 * 数据源 `login_logs` 表（server/db/schema/system.ts），写入由
 * server/services/login-log-service.ts 完成。
 */
export type LoginMethod = 'password' | 'oauth_github' | 'oauth_qq'

export type LoginFailureReason
  = | 'invalid_password' // 密码错误
    | 'banned' // 账号已被封禁
    | 'not_active' // 账号未激活（邮箱未验证）
    | 'oauth_user_unavailable' // OAuth 命中的账号已被删除 / 不可用

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
