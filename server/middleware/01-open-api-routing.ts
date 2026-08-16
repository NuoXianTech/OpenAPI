import { getRequestURL } from 'h3'
import { dynamicGatewayService } from '~~/server/services/dynamic-gateway-service'
import { isReservedPlatformPath } from '~~/server/utils/route-pattern'

export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if (isReservedPlatformPath(pathname)) return
  const result = await dynamicGatewayService.tryHandle(event)
  if (result.matched) return result.response
})
