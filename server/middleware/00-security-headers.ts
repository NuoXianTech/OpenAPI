import { getRequestURL, setResponseHeaders } from 'h3'
import {
  isGatewayRequest,
  resolveApplicationHostRole
} from '~~/server/utils/application-hosts'
import { getAppEventContext } from '~~/server/utils/event-context'
import {
  getSecurityHeaders,
  isHtmlDocumentRoute
} from '~~/server/utils/security-headers'

const isProduction = process.env.NODE_ENV === 'production'

export default defineEventHandler((event) => {
  const requestUrl = getRequestURL(event)
  const role = getAppEventContext(event).applicationHostRole
    ?? resolveApplicationHostRole(requestUrl.hostname)
  setResponseHeaders(event, getSecurityHeaders({
    isProduction,
    isHtmlRoute: !isGatewayRequest(role, requestUrl.pathname)
      && isHtmlDocumentRoute(requestUrl.pathname)
  }))
})
