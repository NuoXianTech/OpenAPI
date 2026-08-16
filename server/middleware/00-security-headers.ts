import { getRequestURL, setResponseHeaders } from 'h3'
import {
  getSecurityHeaders,
  isHtmlDocumentRoute
} from '~~/server/utils/security-headers'

const isProduction = process.env.NODE_ENV === 'production'

export default defineEventHandler((event) => {
  const pathname = getRequestURL(event).pathname
  setResponseHeaders(event, getSecurityHeaders({
    isProduction,
    isHtmlRoute: isHtmlDocumentRoute(pathname)
  }))
})
