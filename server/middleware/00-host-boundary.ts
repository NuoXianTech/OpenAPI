import { getRequestURL } from 'h3'
import { resolveApplicationHostRole } from '~~/server/utils/application-hosts'
import { getAppEventContext } from '~~/server/utils/event-context'
import { gatewayFail } from '~~/server/utils/gateway-response'

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  if (requestUrl.pathname === '/api/health') return

  let role: ReturnType<typeof resolveApplicationHostRole>
  try {
    role = resolveApplicationHostRole(requestUrl.hostname)
  } catch {
    return gatewayFail(event, 400, 'INVALID_HOST', '请求 Host 无效')
  }
  getAppEventContext(event).applicationHostRole = role
  if (role === 'unknown') {
    return gatewayFail(event, 421, 'HOST_NOT_ALLOWED', '请求 Host 未配置')
  }
})
