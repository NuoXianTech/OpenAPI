import { getRequestURL } from 'h3'
import { dynamicGatewayService } from '~~/server/services/dynamic-gateway-service'
import { isReservedPlatformPath } from '~~/server/utils/route-pattern'
import { getAppEventContext } from '~~/server/utils/event-context'
import { resolveApplicationHostRole } from '~~/server/utils/application-hosts'
import { gatewayFail } from '~~/server/utils/gateway-response'

export default defineEventHandler(async (event) => {
  const requestUrl = getRequestURL(event)
  const pathname = requestUrl.pathname
  if (pathname === '/api/health') return
  const role = getAppEventContext(event).applicationHostRole
    ?? resolveApplicationHostRole(requestUrl.hostname)
  if (role === 'console') return
  if (isReservedPlatformPath(pathname)) {
    if (role === 'gateway') {
      return gatewayFail(event, 404, 'ROUTE_NOT_FOUND', '接口不存在')
    }
    return
  }
  const result = await dynamicGatewayService.tryHandle(event)
  if (result.matched) return result.response
  if (role === 'gateway') {
    return gatewayFail(event, 404, 'ROUTE_NOT_FOUND', '接口不存在')
  }
})
