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

export async function requestJson(url: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`音乐上游返回 HTTP ${response.status}`)
  return parseJsonResponseText(await response.text())
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
