import type { H3Error } from 'h3'
import { getRequestURL, send, setResponseHeader } from 'h3'
import { defineNitroErrorHandler } from 'nitropack/runtime'
import { gatewayFail } from '~~/server/utils/gateway-response'

export default defineNitroErrorHandler(function handlePublicApiRouteError(error: H3Error, event) {
  const pathname = getRequestURL(event).pathname
  if (!/^\/v\d+(?:\/|$)/.test(pathname)) return
  setResponseHeader(event, 'cache-control', 'no-store')
  if (error.statusCode === 404) {
    const response = gatewayFail(event, 404, 'API_NOT_FOUND', '接口不存在')
    return send(event, JSON.stringify(response), 'application/json')
  }
})
