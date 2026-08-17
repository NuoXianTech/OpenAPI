import { getRequestURL, setResponseHeaders } from 'h3'
import { isReservedPlatformPath } from '~~/server/utils/route-pattern'
import {
  getSecurityHeaders,
  isHtmlDocumentRoute
} from '~~/server/utils/security-headers'

const isProduction = process.env.NODE_ENV === 'production'

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  setResponseHeaders(event, getSecurityHeaders({
    isProduction,
    isHtmlRoute: isReservedPlatformPath(requestUrl.pathname)
      && isHtmlDocumentRoute(requestUrl.pathname)
  }))
})
