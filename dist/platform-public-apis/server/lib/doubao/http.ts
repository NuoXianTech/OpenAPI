/**
 * doubao 业务层的上游 HTTP 封装（原生 fetch）。
 *
 * 为什么用原生 fetch 而非 $fetch：
 *   - 图片解析要拿 HTML 原文（responseType text）
 *   - 云雀解析依赖「跟随 302 后的最终 URL」（response.url）来取分享参数，$fetch 不暴露该信息
 *   - 需要逐请求自定义 UA / origin / 查询串，原生 fetch 控制更直接
 *
 * 所有网络异常统一转 DoubaoError('business', 502, 'UPSTREAM_ERROR')，调用方无需各自 try/catch 网络层。
 */

import { createDoubaoError } from './types'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

const DEFAULT_TIMEOUT_MS = 15000
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const ALLOWED_UPSTREAM_HOSTS = ['doubao.com', 'qianwen.com', 'jianying.com'] as const

export interface UpstreamRequest {
  method?: string
  headers?: Record<string, string>
  /** 自动 JSON.stringify 并补 content-type */
  body?: unknown
  /** 追加到 URL 的查询串 */
  query?: Record<string, string>
  signal?: AbortSignal
}

function buildUrl(url: string, query?: Record<string, string>): string {
  if (!query) return url
  const u = new URL(url)
  for (const [key, value] of Object.entries(query)) u.searchParams.set(key, value)
  return u.toString()
}

async function request(url: string, opts: UpstreamRequest = {}): Promise<Response> {
  const headers: Record<string, string> = { ...opts.headers }
  let body: string | undefined
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body)
    headers['content-type'] = headers['content-type'] ?? 'application/json'
  }

  try {
    const response = await safeFetch(buildUrl(url, opts.query), {
      allowedHosts: ALLOWED_UPSTREAM_HOSTS,
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS)
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`upstream responded with HTTP ${response.status}`)
    }
    return response
  } catch (error) {
    console.warn('[doubao] upstream request failed', {
      hostname: safeHostname(url),
      error: error instanceof Error ? error.message : String(error)
    })
    throw createDoubaoError('business', 502, 'UPSTREAM_ERROR', '上游请求失败，请稍后重试')
  }
}

function safeHostname(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return 'invalid'
  }
}

/** 取上游 HTML / 文本原文。 */
export async function fetchText(url: string, opts: UpstreamRequest = {}): Promise<string> {
  const res = await request(url, opts)
  return readLimitedText(res, MAX_RESPONSE_BYTES)
}

/** 取上游 JSON；解析失败按业务错误处理。 */
export async function fetchJson<T = unknown>(url: string, opts: UpstreamRequest = {}): Promise<T> {
  const res = await request(url, opts)
  try {
    return JSON.parse(await readLimitedText(res, MAX_RESPONSE_BYTES)) as T
  } catch {
    throw createDoubaoError('business', 502, 'PARSE_FAILED', '上游返回数据格式异常，可能链接已失效')
  }
}

/** 跟随重定向后返回最终 URL（云雀分享短链 → 带 share_id 的落地页）。 */
export async function resolveRedirect(url: string, opts: UpstreamRequest = {}): Promise<string> {
  const res = await request(url, opts)
  return res.url
}
