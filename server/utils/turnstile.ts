// Cloudflare Turnstile 服务端验证。参见 https://developers.cloudflare.com/turnstile/
import { createError } from 'h3'
import { siteSettingsService } from '~~/server/service/siteSettingsService'
import { decryptSecret } from './oauthCrypto'

export type TurnstilePageKey = 'login' | 'register' | 'adminLogin' | 'publicStats' | 'passwordReset'

export interface TurnstileCheck {
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

function pageToggleOf(settings: Awaited<ReturnType<typeof siteSettingsService.getOrCreate>>, page: TurnstilePageKey) {
  switch (page) {
    case 'login': return settings.turnstileLoginEnabled
    case 'register': return settings.turnstileRegisterEnabled
    case 'adminLogin': return settings.turnstileAdminLoginEnabled
    case 'publicStats': return settings.turnstilePublicStatsEnabled
    case 'passwordReset': return settings.turnstilePasswordResetEnabled
  }
}

export async function verifyTurnstileForPage(
  page: TurnstilePageKey,
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<TurnstileCheck> {
  const settings = await siteSettingsService.getOrCreate()

  // 未配置或未启用：完全跳过，不视为失败
  if (!settings.turnstileEnabled || !settings.turnstileSiteKey || !settings.turnstileSecretKey) {
    return { required: false, valid: true }
  }

  if (!pageToggleOf(settings, page)) {
    return { required: false, valid: true }
  }

  if (!token) {
    return { required: true, valid: false, reason: 'missing_token' }
  }

  let secret: string
  try {
    secret = decryptSecret(settings.turnstileSecretKey)
  }
  catch {
    return { required: true, valid: false, reason: 'secret_decrypt_failed' }
  }

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
    })
    if (res?.success) {
      return { required: true, valid: true }
    }
    return { required: true, valid: false, reason: res?.['error-codes']?.[0] || 'verify_failed' }
  }
  catch {
    return { required: true, valid: false, reason: 'verify_exception' }
  }
}

const FAILURE_MESSAGE: Record<string, string> = {
  'missing_token': '请先完成人机验证',
  'secret_decrypt_failed': 'Turnstile 密钥配置异常，请联系管理员',
  'invalid-input-secret': 'Turnstile 密钥配置异常，请联系管理员',
  'missing-input-secret': 'Turnstile 密钥未配置',
  'invalid-input-response': '人机验证 token 无效，请刷新重试',
  'missing-input-response': '请先完成人机验证',
  'timeout-or-duplicate': '人机验证已过期，请刷新重试',
  'verify_failed': '人机验证失败，请重试',
  'verify_exception': '人机验证服务不可用，请稍后重试',
}

export async function assertTurnstileForPage(
  page: TurnstilePageKey,
  token: string | undefined | null,
  remoteIp?: string | null,
) {
  const result = await verifyTurnstileForPage(page, token, remoteIp)
  if (result.required && !result.valid) {
    const message = FAILURE_MESSAGE[result.reason || 'verify_failed'] || '人机验证失败，请重试'
    throw createError({ statusCode: 400, message })
  }
  return result
}
