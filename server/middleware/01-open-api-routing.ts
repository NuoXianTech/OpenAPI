/**
 * 在请求进入 Nuxt 页面渲染器前处理公共 API 的路由错误。
 *
 * GET 请求命中一个仅支持 POST 的公共接口时，Nitro 不会选择该 POST handler，
 * 若不提前终止，请求会落到 Vue Router 并产生“找不到页面路由”的警告。
 */

import { getRequestURL, setResponseHeader } from 'h3'
import {
  API_GUARD_ERROR,
  VERSION_CODE_PATTERN,
  normalizePathname
} from '~~/server/config/api-guard'
import { getAllowedMethods, matchEndpoint } from '~~/server/utils/api-manifest'
import { openApiFail } from '~~/server/utils/open-api-response'

export default defineEventHandler((event) => {
  const pathname = normalizePathname(getRequestURL(event).pathname)
  const routeMatch = VERSION_CODE_PATTERN.exec(pathname)
  if (!routeMatch) return

  const pathVersion = routeMatch[1]!
  const code = routeMatch[2]!
  const method = (event.method || 'GET').toUpperCase()
  const endpoint = matchEndpoint(pathVersion, code, pathname, method)
    ?? (method === 'HEAD' ? matchEndpoint(pathVersion, code, pathname, 'GET') : null)
  if (endpoint) return

  setResponseHeader(event, 'cache-control', 'no-store')
  const allowedMethods = getAllowedMethods(pathVersion, code, pathname)
  if (allowedMethods.length > 0) {
    setResponseHeader(event, 'allow', allowedMethods.join(', '))
    return openApiFail(
      event,
      API_GUARD_ERROR.METHOD_NOT_ALLOWED.status,
      API_GUARD_ERROR.METHOD_NOT_ALLOWED.code,
      API_GUARD_ERROR.METHOD_NOT_ALLOWED.msg
    )
  }

  return openApiFail(event, 404, 'API_NOT_FOUND', '接口不存在')
})
