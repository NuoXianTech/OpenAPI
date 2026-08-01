import { getRequestURL, setResponseHeaders } from 'h3'
import {
  getSecurityHeaders,
  isHtmlDocumentRoute,
  isPlayerHtmlRoute
} from '~~/server/utils/security-headers'

const isProduction = process.env.NODE_ENV === 'production'

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  setResponseHeaders(event, getSecurityHeaders({
    isProduction,
    isPlayerRoute: isPlayerHtmlRoute(pathname),
    isHtmlRoute: isHtmlDocumentRoute(pathname)
  }))
})
