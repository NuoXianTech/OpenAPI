/**
 * HTTP 方法 → Nuxt UI Badge 颜色的统一映射。
 *
 * 语义分组:读(GET)=success、创建(POST)=info、修改(PUT/PATCH)=warning、
 * 删除(DELETE)=error、其它=neutral。全站 method Badge 的唯一来源。
 *
 * 注意:这是 HTTP 方法着色，与「登录方式」着色(LOGIN_METHOD_META)是两个概念，勿混用。
 */
export type HttpMethodColor = 'success' | 'info' | 'warning' | 'error' | 'neutral'

export function httpMethodColor(method: string): HttpMethodColor {
  switch (method.trim().toUpperCase()) {
    case 'GET': return 'success'
    case 'POST': return 'info'
    case 'PUT':
    case 'PATCH': return 'warning'
    case 'DELETE': return 'error'
    default: return 'neutral'
  }
}
