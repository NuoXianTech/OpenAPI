// Cloudflare Turnstile 服务端验证。参见 https://developers.cloudflare.com/turnstile/
import { createError } from 'h3'
import { systemSettingsService } from '~~/server/services/system-settings-service'

export type TurnstilePageKey = 'login' | 'register' | 'passwordReset' | 'checkin'

interface TurnstileCheck {
  required: boolean
  valid: boolean
  reason?: string
}

interface SiteVerifyResponse {
  'success': boolean
  'error-codes'?: string[]
  'hostname'?: string
  'challenge_ts'?: string
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

function pageToggleOf(settings: Awaited<ReturnType<typeof systemSettingsService.getSettings>>, page: TurnstilePageKey) {
  switch (page) {
    case 'login': return settings.turnstileLoginEnabled
    case 'register': return settings.turnstileRegisterEnabled
    case 'passwordReset': return settings.turnstilePasswordResetEnabled
    case 'checkin': return settings.turnstileCheckinEnabled
  }
}

async function verifyTurnstileForPage(
  page: TurnstilePageKey,
  token: string | undefined | null,
  remoteIp?: string | null
): Promise<TurnstileCheck> {
  const settings = await systemSettingsService.getSettings()
  const required = pageToggleOf(settings, page)

  if (!required) {
    return { required: false, valid: true }
  }

  // 场景已开启但凭据不完整时必须失败关闭，避免后台显示“已开启”而实际跳过校验。
  if (!settings.turnstileSiteKey || !settings.turnstileSecretKey) {
    return { required: true, valid: false, reason: 'misconfigured' }
  }

  if (!token) {
    return { required: true, valid: false, reason: 'missing_token' }
  }

  const secret = settings.turnstileSecretKey

  const form = new URLSearchParams()
  form.append('secret', secret)
  form.append('response', token)
  if (remoteIp) {
    form.append('remoteip', remoteIp)
  }

  try {
    const res = await $fetch<SiteVerifyResponse>(VERIFY_URL, {
      method: 'POST',
      body: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 5_000,
      retry: 0
    })
    if (res?.success) {
      return { required: true, valid: true }
    }
    return { required: true, valid: false, reason: res?.['error-codes']?.[0] || 'verify_failed' }
  } catch {
    return { required: true, valid: false, reason: 'verify_exception' }
  }
}

const FAILURE_MESSAGE: Record<string, string> = {
  'missing_token': '请先完成人机验证',
  'invalid-input-secret': 'Turnstile 密钥配置异常，请联系管理员',
  'missing-input-secret': 'Turnstile 密钥未配置',
  'invalid-input-response': '人机验证 token 无效，请刷新重试',
  'missing-input-response': '请先完成人机验证',
  'timeout-or-duplicate': '人机验证已过期，请刷新重试',
  'verify_failed': '人机验证失败，请重试',
  'misconfigured': 'Turnstile 配置不完整，请联系管理员',
  'verify_exception': '人机验证服务不可用，请稍后重试'
}

export async function assertTurnstileForPage(
  page: TurnstilePageKey,
  token: string | undefined | null,
  remoteIp?: string | null
) {
  const result = await verifyTurnstileForPage(page, token, remoteIp)
  if (result.required && !result.valid) {
    const message = FAILURE_MESSAGE[result.reason || 'verify_failed'] || '人机验证失败，请重试'
    throw createError({ statusCode: 400, message })
  }
  return result
}
