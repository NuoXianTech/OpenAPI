export const INITIAL_ADMIN_PROFILE = {
  username: 'admin',
  email: 'admin@openapi.com',
  displayName: 'admin'
} as const

export const ADMIN_PROFILE_ONBOARDING_UPDATE_ACTION = 'admin.profile.onboarding.update'

export interface AdminProfileIdentity {
  username?: string | null
  email?: string | null
}

/**
 * 账号是否仍在使用出厂身份。
 *
 * 用于把「初始管理员引导」限定在出厂账号上：管理员后续新建的管理员账号身份由
 * 创建者填写，与出厂值无关，不应被引导拦住。
 */
function usesInitialAdminIdentity(profile: AdminProfileIdentity): boolean {
  return normalizeIdentity(profile.username) === INITIAL_ADMIN_PROFILE.username
    || normalizeIdentity(profile.email) === INITIAL_ADMIN_PROFILE.email
}

/**
 * 出厂口令是否已经轮换。
 *
 * 出厂管理员由启动流程以随机口令创建，`tokenVersion` 为 0；任何一次改密
 * （引导流程、用户自助改密、密码重置）都会自增它。因此 `tokenVersion > 0`
 * 等价于「启动日志里那个一次性口令已不再有效」。
 */
function hasRotatedInitialAdminPassword(profile: { tokenVersion?: number | null }): boolean {
  return (profile.tokenVersion ?? 0) > 0
}

/**
 * 是否仍需完成初始管理员引导。
 *
 * 两个信号取交集，缺一不可：
 *   - 仍在使用出厂身份：把引导限定在出厂账号上。只看口令的话，管理员新建的
 *     管理员（tokenVersion 默认为 0）会被要求去改一个它从来没有过的出厂密码，
 *     并且在改之前被挡在所有管理端点之外。
 *   - 出厂口令未轮换：这才是引导要解决的实际风险。只看身份的话，用户名与邮箱
 *     允许保持默认，引导会永久弹出。
 *
 * 不用「存在引导审计记录」作为完成标记：审计日志可被管理员清理，
 * 清理后引导会重新弹出——完成状态不该依赖一条可删除的记录。
 */
export function needsInitialAdminOnboarding(
  profile: AdminProfileIdentity & { tokenVersion?: number | null }
): boolean {
  return usesInitialAdminIdentity(profile) && !hasRotatedInitialAdminPassword(profile)
}

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}
