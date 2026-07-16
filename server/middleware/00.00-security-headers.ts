import { getRequestURL, setResponseHeader } from 'h3'
import {
  createSecurityHeaders,
  isHtmlDocumentRoute,
  isPlayerHtmlRoute
} from '~~/server/utils/security-headers'

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  const headers = createSecurityHeaders({
    isProduction: process.env.NODE_ENV === 'production',
    isPlayerRoute: isPlayerHtmlRoute(pathname),
    isHtmlRoute: isHtmlDocumentRoute(pathname)
  })

  for (const [name, value] of Object.entries(headers)) {
    setResponseHeader(event, name, value)
  }
})
