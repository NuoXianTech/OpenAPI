// 回读「待处理 OAuth 身份」供 /oauth/complete 窗口渲染。
// 仅暴露展示用字段，不返回 providerUserId；由持有签名 pending cookie 者（刚走完 OAuth 流程）访问。
import { setResponseHeader } from 'h3'
import { readPendingOauth } from '~~/server/utils/oauth-pending'
import { systemSettingsService } from '~~/server/services/system-settings-service'
import { userService } from '~~/server/services/user-service'
import { OAUTH_PROVIDER_PRESETS } from '~~/server/config/oauth-provider-presets'

function sanitizeUsername(base: string) {
  return base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'user'
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const pending = readPendingOauth(event)
  if (!pending) {
    return { pending: false as const }
  }

  const settings = await systemSettingsService.getSettings()
  const preset = OAUTH_PROVIDER_PRESETS[pending.provider]

  // 该邮箱是否已有账号：仅用于在窗口里提示「看起来你已有账号，建议绑定」
  let emailHasAccount = false
  if (pending.email) {
    const matched = await userService.findByEmail(pending.email.toLowerCase())
    emailHasAccount = Boolean(matched)
  }

  return {
    pending: true as const,
    provider: pending.provider,
    displayName: preset.displayName,
    icon: preset.icon,
    nickname: pending.nickname,
    avatarUrl: pending.avatarUrl,
    email: pending.email, // 新注册表单预填建议
    suggestedUsername: sanitizeUsername(pending.nickname || pending.provider),
    emailHasAccount,
    // 强制绑定 / 注册关闭时不允许新注册，窗口隐藏「新注册」
    allowRegister: !settings.oauthForceBinding && settings.registrationMode !== 'closed'
  }
})
