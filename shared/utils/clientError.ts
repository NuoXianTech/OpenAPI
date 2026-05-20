/**
 * 统一解析 $fetch / FetchError 的错误，给前端 toast 用。
 *
 * 解析优先级：
 *   1. err.data.message（服务端 createError 抛出的明文消息）
 *   2. codeMap[statusCode]（按 HTTP 状态映射的本地化文案）
 *      - 若 codeMap 含 500 这一 key，任何 status>=500 都会落到 500 文案，
 *        匹配 login/register 等页面"≥500 当 5xx 处理"的既有约定
 *   3. err.statusMessage（H3 createError 的 statusMessage，作为 data.message 的兜底）
 *   4. err.message（Error 抛出的原始消息）
 *   5. fallback（兜底文案）
 */

interface FetchLikeError {
  data?: { message?: unknown }
  statusCode?: number
  status?: number
  statusMessage?: unknown
  message?: unknown
}

export function parseFetchError(
  err: unknown,
  fallback: string,
  codeMap?: Record<number, string>
): string {
  if (err && typeof err === 'object') {
    const e = err as FetchLikeError
    const dataMessage = e.data?.message
    if (typeof dataMessage === 'string' && dataMessage) {
      return dataMessage
    }

    if (codeMap) {
      const status = e.statusCode ?? e.status
      if (typeof status === 'number') {
        if (codeMap[status]) return codeMap[status]
        if (status >= 500 && codeMap[500]) return codeMap[500]
      }
    }

    if (typeof e.statusMessage === 'string' && e.statusMessage) {
      return e.statusMessage
    }
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}
