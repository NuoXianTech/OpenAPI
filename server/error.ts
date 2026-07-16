import type { H3Error } from 'h3'
import { getRequestURL, send, setResponseHeader } from 'h3'
import { defineNitroErrorHandler } from 'nitropack/runtime'
import { VERSION_CODE_PATTERN, normalizePathname } from '~~/server/config/api-guard'
import { getAllowedMethods } from '~~/server/utils/api-manifest'
import { openApiFail } from '~~/server/utils/open-api-response'

export default defineNitroErrorHandler(function handlePublicApiRouteError(error: H3Error, event) {
  const pathname = normalizePathname(getRequestURL(event).pathname)
  const routeMatch = VERSION_CODE_PATTERN.exec(pathname)
  if (!routeMatch) return

  const pathVersion = routeMatch[1]!
  const code = routeMatch[2]!
  const method = (event.method || 'GET').toUpperCase()
  const allowedMethods = getAllowedMethods(pathVersion, code, pathname)
  const isAllowedMethod = allowedMethods.includes(method)
    || (method === 'HEAD' && allowedMethods.includes('GET'))

  setResponseHeader(event, 'cache-control', 'no-store')

  if (allowedMethods.length > 0 && !isAllowedMethod) {
    setResponseHeader(event, 'allow', allowedMethods.join(', '))
    const response = openApiFail(event, 405, 'METHOD_NOT_ALLOWED', '请求方法不受支持')
    return send(event, JSON.stringify(response), 'application/json')
  }

  if (error.statusCode === 404) {
    const response = openApiFail(event, 404, 'API_NOT_FOUND', '接口不存在')
    return send(event, JSON.stringify(response), 'application/json')
  }
})
