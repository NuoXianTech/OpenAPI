import type { H3Event } from 'h3'
import { getRouterParam, sendRedirect } from 'h3'
import { handleOauthCallback } from '~~/server/utils/oauth-callback'
import { providerByIndex } from '~~/shared/types/oauth'

/**
 * 第三方登录统一回调入口：/callback/openid/{index}
 *
 * 数字索引由 SUPPORTED_OAUTH_PROVIDERS 顺序决定（0=github, 1=qq）。
 * 对外曝出固定前缀 /callback/openid/ 让第三方平台白名单更稳定，
 * 不会因为新增 provider 而需要修改已登记的回调地址前缀。
 */
export default defineEventHandler(async (event: H3Event) => {
  const indexParam = getRouterParam(event, 'index') || ''
  const index = Number.parseInt(indexParam, 10)
  if (!Number.isInteger(index) || index < 0) {
    return sendRedirect(event, `/login?oauth_error=${encodeURIComponent('provider_not_supported')}`, 302)
  }
  const provider = providerByIndex(index)
  if (!provider) {
    return sendRedirect(event, `/login?oauth_error=${encodeURIComponent('provider_not_supported')}`, 302)
  }
  return handleOauthCallback(event, provider)
})
