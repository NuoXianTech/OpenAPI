const COMMON_SECURITY_HEADERS = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Permitted-Cross-Domain-Policies': 'none'
} as const

const HTML_DOCUMENT_SECURITY_HEADERS = {
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ].join(', ')
} as const

function createApplicationCsp(frameSources: string): string {
  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://challenges.cloudflare.com`,
    `frame-src ${frameSources}`,
    `media-src 'self' blob: https:`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`
  ].join('; ')
}

const PRODUCTION_APPLICATION_CSP = createApplicationCsp('https://challenges.cloudflare.com')
const DEVELOPMENT_APPLICATION_CSP = createApplicationCsp(`'self' https://challenges.cloudflare.com`)

export interface SecurityHeadersOptions {
  isProduction: boolean
  isHtmlRoute: boolean
}

const securityHeadersCache = new Map<number, Readonly<Record<string, string>>>()

export function getSecurityHeaders(options: SecurityHeadersOptions): Readonly<Record<string, string>> {
  const cacheKey = Number(options.isProduction) << 1
    | Number(options.isHtmlRoute)
  const cached = securityHeadersCache.get(cacheKey)
  if (cached) return cached

  const headers: Record<string, string> = {
    ...COMMON_SECURITY_HEADERS
  }

  if (options.isHtmlRoute) {
    Object.assign(headers, HTML_DOCUMENT_SECURITY_HEADERS)
    headers['Content-Security-Policy'] = options.isProduction
      ? PRODUCTION_APPLICATION_CSP
      : DEVELOPMENT_APPLICATION_CSP
    headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    headers['Origin-Agent-Cluster'] = '?1'
    headers['X-Frame-Options'] = 'DENY'
  }

  if (options.isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }

  const resolvedHeaders = Object.freeze(headers)
  securityHeadersCache.set(cacheKey, resolvedHeaders)
  return resolvedHeaders
}

export function isHtmlDocumentRoute(pathname: string): boolean {
  return !pathname.startsWith('/api/')
    && !pathname.startsWith('/_nuxt/')
    && !/\.[a-z0-9]{2,8}$/i.test(pathname)
}
