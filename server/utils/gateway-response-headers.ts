const BLOCKED_RESPONSE_HEADERS = new Set([
  'clear-site-data',
  'connection',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-embedder-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
  'keep-alive',
  'origin-agent-cluster',
  'permissions-policy',
  'proxy-authenticate',
  'proxy-authorization',
  'referrer-policy',
  'service-worker-allowed',
  'set-cookie',
  'set-cookie2',
  'strict-transport-security',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-content-type-options',
  'x-frame-options',
  'x-permitted-cross-domain-policies'
])

export function sanitizeGatewayResponseHeaders(source: Headers): Headers {
  const headers = new Headers()
  for (const [name, value] of source) {
    const normalized = name.toLowerCase()
    if (BLOCKED_RESPONSE_HEADERS.has(normalized)) continue
    if (normalized.startsWith('access-control-')) continue
    headers.append(name, value)
  }
  return headers
}
