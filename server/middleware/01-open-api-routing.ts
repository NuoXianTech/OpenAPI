import { getRequestURL } from 'h3'
import { dynamicGatewayService } from '~~/server/services/dynamic-gateway-service'
import { isReservedPlatformPath } from '~~/server/utils/route-pattern'
import { gatewayFail } from '~~/server/utils/gateway-response'

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if (isReservedPlatformPath(pathname)) return

  const result = await dynamicGatewayService.tryHandle(event)
  if (result.matched) return result.response
  return gatewayFail(event, 404, 'API_NOT_FOUND', '接口不存在')
})
