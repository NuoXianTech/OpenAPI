/**
 * 操作日志 · 动作 key → 中文行为映射
 *
 * 系统侧（DB / API / 筛选）始终使用稳定的点分 key（如 `admin.announcement.create`），
 * 仅在面向人工查看的管理后台渲染时转成中文行为（如「创建公告」）。
 *
 * 新增动作时：先在写日志处确定 key，再来此处补一行映射。
 * 未命中的 key 由 resolveOperationLogActionLabel 回退为原始 key，不会渲染空白。
 */

const OPERATION_LOG_ACTION_LABELS: Record<string, string> = {
  // ─── 接口分类 ───────────────────────────────────────────────
  'admin.api-category.create': '创建接口分类',
  'admin.api-category.update': '更新接口分类',
  'admin.api-category.delete': '删除接口分类',

  // ─── 接口 ───────────────────────────────────────────────────
  'admin.api.register': '注册接口',
  'admin.api.update': '更新接口',
  'admin.api.delete': '删除接口',
  'admin.api.toggle.isEnabled': '切换接口启用状态',
  'admin.api.toggle.isStatistics': '切换接口统计状态',

  // ─── 友情链接 ───────────────────────────────────────────────
  'admin.friend-link.create': '创建友情链接',
  'admin.friend-link.update': '更新友情链接',
  'admin.friend-link.delete': '删除友情链接',

  // ─── 公告 ───────────────────────────────────────────────────
  'admin.announcement.create': '创建公告',
  'admin.announcement.update': '更新公告',
  'admin.announcement.delete': '删除公告',

  // ─── 站内通知 ───────────────────────────────────────────────
  'admin.notification.send': '发送通知',
  'admin.notification.delete': '删除通知',

  // ─── API 密钥 ───────────────────────────────────────────────
  'admin.api-key.create': '创建 API 密钥',
  'admin.api-key.update': '更新 API 密钥',
  'admin.api-key.reset': '重置 API 密钥',

  // ─── 用户 ───────────────────────────────────────────────────
  'admin.user.create': '创建用户',
  'admin.user.update': '更新用户',
  'admin.user.delete': '删除用户',
  'admin.user.ban': '封禁用户',
  'admin.user.unban': '解封用户',

  // ─── 积分 ───────────────────────────────────────────────────
  'admin.credit.grant': '发放积分',
  'admin.credit.revoke': '扣除积分',
  'admin.credit.reset': '重置积分',

  // ─── 兑换码 ─────────────────────────────────────────────────
  'admin.redemption-code.generate': '生成兑换码',
  'admin.redemption-code.delete': '删除兑换码',
  'admin.redemption-code.batch-delete': '批量删除兑换码',
  'admin.redemption-code.enable': '启用兑换码',
  'admin.redemption-code.disable': '停用兑换码',
  'admin.redemption-code.batch-enable': '批量启用兑换码',
  'admin.redemption-code.batch-disable': '批量停用兑换码',

  // ─── OAuth ──────────────────────────────────────────────────
  'admin.oauth-provider.update': '更新 OAuth 配置',

  // ─── 系统设置 ───────────────────────────────────────────────
  'admin.settings.update': '更新系统设置',
  'admin.settings.smtp.test': '测试邮件发送',

  // ─── 用户端自助操作 ─────────────────────────────────────────
  'user.checkin': '每日签到',
  'user.password.change': '修改密码',
  'user.oauth.unbind': '解绑第三方账号',
  'user.redemption-code.redeem': '兑换码兑换'
}

/**
 * 将动作 key 解析为中文行为；未命中时回退为原始 key（便于排查新动作）。
 */
export function resolveOperationLogActionLabel(action: string): string {
  return OPERATION_LOG_ACTION_LABELS[action] ?? action
}
