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

const PLAYER_CSP = [
  `default-src 'none'`,
  `base-uri 'none'`,
  `object-src 'none'`,
  'frame-ancestors *',
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'unsafe-inline'`,
  'img-src data: blob: http: https:',
  'media-src blob: http: https:',
  'connect-src http: https:',
  'worker-src blob:'
].join('; ')

export interface SecurityHeadersOptions {
  isProduction: boolean
  isPlayerRoute: boolean
  isHtmlRoute: boolean
}

const securityHeadersCache = new Map<number, Readonly<Record<string, string>>>()

export function getSecurityHeaders(options: SecurityHeadersOptions): Readonly<Record<string, string>> {
  const cacheKey = Number(options.isProduction) << 2
    | Number(options.isPlayerRoute) << 1
    | Number(options.isHtmlRoute)
  const cached = securityHeadersCache.get(cacheKey)
  if (cached) return cached

  const headers: Record<string, string> = {
    ...COMMON_SECURITY_HEADERS
  }

  if (options.isHtmlRoute) {
    Object.assign(headers, HTML_DOCUMENT_SECURITY_HEADERS)
    headers['Content-Security-Policy'] = options.isPlayerRoute
      ? PLAYER_CSP
      : options.isProduction ? PRODUCTION_APPLICATION_CSP : DEVELOPMENT_APPLICATION_CSP

    if (!options.isPlayerRoute) {
      headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
      headers['Origin-Agent-Cluster'] = '?1'
      headers['X-Frame-Options'] = 'DENY'
    }
  }

  if (options.isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
  }

  const resolvedHeaders = Object.freeze(headers)
  securityHeadersCache.set(cacheKey, resolvedHeaders)
  return resolvedHeaders
}

export function isPlayerHtmlRoute(pathname: string): boolean {
  return /^\/v\d+\/player(?:\/art)?\/?$/.test(pathname)
}

export function isHtmlDocumentRoute(pathname: string): boolean {
  if (isPlayerHtmlRoute(pathname)) return true

  return !pathname.startsWith('/api/')
    && !pathname.startsWith('/_nuxt/')
    && !pathname.startsWith('/player/lib/')
    && !/^\/v\d+(?:\/|$)/.test(pathname)
    && !/\.[a-z0-9]{2,8}$/i.test(pathname)
}
