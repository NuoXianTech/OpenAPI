import { readQueryString } from '~~/server/utils/request-query'

export interface DoubaoImage {
  url: string
  [key: string]: unknown
}

export interface DoubaoVideo {
  url: string
  width: number
  height: number
  definition: string
  poster_url: string
  duration?: number
  codec_type?: string
}

export const IMAGE_SOURCE_LABELS = {
  doubao: '豆包',
  qianwen: '千问'
} as const
type ImageSource = keyof typeof IMAGE_SOURCE_LABELS

export const VIDEO_SOURCE_LABELS = {
  doubao: '豆包',
  yunque: '云雀'
} as const
type VideoSource = keyof typeof VIDEO_SOURCE_LABELS

export function detectImageSource(url: string): ImageSource {
  return url.includes('doubao.com') ? 'doubao' : 'qianwen'
}

export function detectVideoSource(url: string): VideoSource {
  return url.includes('doubao.com') ? 'doubao' : 'yunque'
}

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

interface DoubaoFailure {
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

interface MediaQuery {
  url: string
  raw: boolean
}

function isTruthy(value: unknown): boolean {
  const s = readQueryString(value).trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes'
}

export function parseMediaQuery(query: Record<string, unknown>): MediaQuery {
  const url = readQueryString(query.url).trim()
  if (!url) {
    throw createDoubaoError('input', 400, 'MISSING_PARAMETER', '缺少参数 url')
  }
  if (!/^https?:\/\//i.test(url)) {
    throw createDoubaoError('input', 400, 'INVALID_PARAMETER', 'url 必须是合法的 http(s) 链接')
  }
  return { url, raw: isTruthy(query.raw) }
}

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
