import type { MusicTrack } from './types'

export interface UnknownRecord { [key: string]: unknown }

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (Array.isArray(current) && /^\d+$/.test(key)) return current[Number(key)]
    return isRecord(current) ? current[key] : undefined
  }, value)
}

export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

export function readNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function splitArtists(value: unknown, separator: string | RegExp): string[] {
  return typeof value === 'string' ? value.split(separator).map(item => item.trim()).filter(Boolean) : []
}

export function mergeCookieHeader(defaultCookie: string, configuredCookie: string): string {
  const cookies = new Map<string, string>()
  for (const source of [defaultCookie, configuredCookie]) {
    for (const entry of source.split(';')) {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex <= 0) continue
      const name = entry.slice(0, separatorIndex).trim()
      if (!name) continue
      cookies.set(name, entry.slice(separatorIndex + 1).trim())
    }
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')
}

function extractJsonValue(text: string): string | null {
  const objectStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  const start = objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart)
  if (start < 0) return null
  const opening = text[start]
  const closing = opening === '{' ? '}' : ']'
  let depth = 0
  let isInString = false
  let isEscaped = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (isInString) {
      if (isEscaped) isEscaped = false
      else if (character === '\\') isEscaped = true
      else if (character === '"') isInString = false
      continue
    }
    if (character === '"') isInString = true
    else if (character === opening) depth += 1
    else if (character === closing && --depth === 0) return text.slice(start, index + 1)
  }
  return null
}

export function parseJsonResponseText(text: string): unknown {
  const normalized = text.replace(/^\uFEFF/, '').trim()
  const extracted = extractJsonValue(normalized)
  if (!extracted) throw new Error('音乐上游返回了无效数据')
  try { return JSON.parse(extracted) as unknown } catch { throw new Error('音乐上游返回了无效 JSON 数据') }
}

function readRequestErrorCode(error: unknown): string {
  for (const candidate of [error, isRecord(error) ? error.cause : undefined]) {
    if (!isRecord(candidate)) continue
    const code = candidate.code
    if (typeof code === 'string' || typeof code === 'number') return String(code)
  }
  return ''
}

function readUpstreamHostname(url: string): string {
  try { return new URL(url).hostname } catch { return 'unknown-host' }
}

export async function requestText(url: string, options: RequestInit = {}): Promise<string> {
  const hostname = readUpstreamHostname(url)
  let response: Response
  try {
    response = await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(15_000) })
  } catch (error) {
    const code = readRequestErrorCode(error)
    const detail = code || (error instanceof Error ? error.message : String(error))
    throw new Error(`音乐上游 ${hostname} 请求失败${detail ? `（${detail}）` : ''}`, { cause: error })
  }
  if (!response.ok) throw new Error(`音乐上游 ${hostname} 返回 HTTP ${response.status}`)
  return response.text()
}

export async function requestJson(url: string, options: RequestInit = {}): Promise<unknown> {
  return parseJsonResponseText(await requestText(url, options))
}

export function buildUrl(baseUrl: string, params: Record<string, string | number>): string {
  const url = new URL(baseUrl)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  return url.toString()
}

export function normalizeCollection(payload: unknown, path: string, normalize: (value: unknown) => MusicTrack | null): MusicTrack[] {
  const collection = path ? readPath(payload, path) : payload
  const values = Array.isArray(collection) ? collection : isRecord(collection) ? [collection] : []
  return values.map(normalize).filter((track): track is MusicTrack => track !== null)
}
