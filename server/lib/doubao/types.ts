/**
 * doubao（豆包 / 千问 / 云雀解析）业务层契约与常量。
 *
 * - DoubaoImage / DoubaoVideo：对外输出的归一化结构（原始上游字段按需透传）
 * - 数据来源用 as const 对象映射表达「合法集合」（替代 enum），保持类型安全与可扩展
 * - DoubaoError：业务层统一错误类，区分「输入错误（4xx）」与「业务/上游错误」，
 *   由 route handler 映射到 openApiFail / openApiBizFail
 * - parseMediaQuery：集中处理对外接口的 url / raw 入参校验
 */

/** 图片记录：透传上游原始字段，至少含可访问的 url。 */
export interface DoubaoImage {
  url: string
  [key: string]: unknown
}

/** 视频记录：归一化后的可播放信息。豆包含时长 / 编码，云雀缺省这两项。 */
export interface DoubaoVideo {
  url: string
  width: number
  height: number
  definition: string
  poster_url: string
  duration?: number
  codec_type?: string
}

/** 图片来源 → 中文标签。键集合即合法来源全集。 */
export const IMAGE_SOURCE_LABELS = {
  doubao: '豆包',
  qianwen: '千问'
} as const
export type ImageSource = keyof typeof IMAGE_SOURCE_LABELS

/** 视频来源 → 中文标签。键集合即合法来源全集。 */
export const VIDEO_SOURCE_LABELS = {
  doubao: '豆包',
  yunque: '云雀'
} as const
export type VideoSource = keyof typeof VIDEO_SOURCE_LABELS

/** 按链接域名判定图片来源：含 doubao.com 走豆包，其余按千问处理（对齐参考实现）。 */
export function detectImageSource(url: string): ImageSource {
  return url.includes('doubao.com') ? 'doubao' : 'qianwen'
}

/** 按链接域名判定视频来源：含 doubao.com 走豆包，其余按云雀处理（对齐参考实现）。 */
export function detectVideoSource(url: string): VideoSource {
  return url.includes('doubao.com') ? 'doubao' : 'yunque'
}

/**
 * 业务层错误。
 * - kind='input'：调用方输入问题（缺参 / 格式错 / 链接不支持）→ 4xx，纯协议失败
 * - kind='business'：上游网络 / 数据结构解析失败 → 4xx/5xx，业务失败（写调用日志、跳过扣费）
 */
export interface DoubaoError extends Error {
  readonly name: 'DoubaoError'
  readonly kind: 'input' | 'business'
  readonly status: number
  readonly code: string
}

export function createDoubaoError(
  kind: 'input' | 'business',
  status: number,
  code: string,
  message: string
): DoubaoError {
  return Object.assign(new Error(message), {
    name: 'DoubaoError' as const,
    kind,
    status,
    code
  })
}

function isDoubaoError(error: unknown): error is DoubaoError {
  return error instanceof Error
    && error.name === 'DoubaoError'
    && ((error as { kind?: unknown }).kind === 'input' || (error as { kind?: unknown }).kind === 'business')
    && typeof (error as { status?: unknown }).status === 'number'
    && typeof (error as { code?: unknown }).code === 'string'
}

/** 把任意异常归类为对外失败描述，供 route handler 选择 openApiFail / openApiBizFail。 */
export interface DoubaoFailure {
  status: number
  code: string
  message: string
  biz: boolean
}

export function classifyDoubaoError(err: unknown, fallbackMessage: string): DoubaoFailure {
  if (isDoubaoError(err)) {
    return { status: err.status, code: err.code, message: err.message, biz: err.kind === 'business' }
  }
  return { status: 500, code: 'PARSE_FAILED', message: fallbackMessage, biz: true }
}

/** 对外接口公共入参（url 必填、raw 可选）。 */
export interface MediaQuery {
  url: string
  raw: boolean
}

/** getQuery 的值可能是 string | string[] | undefined，统一取首个并转字符串。 */
function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0])
  return value === undefined || value === null ? '' : String(value)
}

/** 宽松真值：raw=1 / true / yes 视为开启原始模式。 */
function isTruthy(value: unknown): boolean {
  const s = firstString(value).trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

/**
 * 校验并归一化对外接口入参。校验失败抛 DoubaoError(kind='input')，
 * 由 handler 转 openApiFail（400，纯协议失败，自动跳过扣费）。
 */
export function parseMediaQuery(query: Record<string, unknown>): MediaQuery {
  const url = firstString(query.url).trim()
  if (!url) {
    throw createDoubaoError('input', 400, 'MISSING_PARAMETER', '缺少参数 url')
  }
  if (!/^https?:\/\//i.test(url)) {
    throw createDoubaoError('input', 400, 'INVALID_PARAMETER', 'url 必须是合法的 http(s) 链接')
  }
  return { url, raw: isTruthy(query.raw) }
}

/* ── 解析上游 JSON 的安全访问器（上游结构不可控，统一以 unknown 收口后逐层收窄） ── */

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function asNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
