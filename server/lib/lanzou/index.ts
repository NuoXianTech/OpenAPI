import * as cheerio from 'cheerio'
import { readLimitedText, safeFetch } from '~~/server/utils/safe-fetch'

const LANZOU_HOST = 'www.lanzouf.com'
const LANZOU_ALLOWED_HOSTS = ['lanzouf.com'] as const
const LANZOU_DOWNLOAD_HOSTS = ['lanrar.com', 'lanzoug.com', 'baidupan.com'] as const
const LANZOU_HOST_PATTERN = /^(?:[a-z0-9-]+\.)?lanzou[a-z]?\.com$/i
const LANZOU_FILE_ID_PATTERN = /^i[a-z0-9_-]{5,127}$/i
const MAX_INPUT_LENGTH = 2_048
const MAX_HTML_BYTES = 1024 * 1024
const MAX_JSON_BYTES = 64 * 1024

const REQUEST_HEADERS = {
  'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
  'accept-language': 'zh-CN,zh;q=0.9',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36 OpenAPI/Lanzou'
} as const

type LanzouErrorKind = 'input' | 'business' | 'upstream'
type UnknownRecord = Record<string, unknown>

export interface LanzouFileData {
  name: string
  size: string
  url: string
}

export interface LanzouFailure {
  status: number
  code: string
  message: string
  biz: boolean
}

class LanzouError extends Error {
  constructor(
    readonly kind: LanzouErrorKind,
    readonly status: number,
    readonly code: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
  }
}

function createError(
  kind: LanzouErrorKind,
  status: number,
  code: string,
  message: string,
  options?: ErrorOptions
): LanzouError {
  return new LanzouError(kind, status, code, message, options)
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readText(value: unknown, maxLength = 512): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function normalizeVisibleText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isKnownDownloadHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  return LANZOU_DOWNLOAD_HOSTS.some(host => normalized === host || normalized.endsWith(`.${host}`))
}

function parseHttpsUrl(value: string, allowedHostname: (hostname: string) => boolean): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return null
    return allowedHostname(url.hostname) ? url : null
  } catch {
    return null
  }
}

export function parseLanzouShareUrl(input: string): URL {
  const normalized = input.trim()
  if (!normalized) {
    throw createError('input', 400, 'MISSING_URL', '缺少参数 url')
  }
  if (normalized.length > MAX_INPUT_LENGTH) {
    throw createError('input', 400, 'INVALID_URL', `url 不能超过 ${MAX_INPUT_LENGTH} 个字符`)
  }

  let sourceUrl: URL
  try {
    sourceUrl = new URL(normalized)
  } catch {
    throw createError('input', 400, 'INVALID_URL', 'url 必须是有效的蓝奏云 HTTPS 文件分享链接')
  }

  if (
    sourceUrl.protocol !== 'https:'
    || sourceUrl.username
    || sourceUrl.password
    || (sourceUrl.port && sourceUrl.port !== '443')
    || !LANZOU_HOST_PATTERN.test(sourceUrl.hostname)
  ) {
    throw createError('input', 400, 'INVALID_URL', 'url 必须是有效的蓝奏云 HTTPS 文件分享链接')
  }

  const pathSegments = sourceUrl.pathname.split('/').filter(Boolean)
  const fileId = pathSegments[0] || ''
  if (pathSegments.length === 1 && /^b[a-z0-9_-]+$/i.test(fileId)) {
    throw createError('business', 422, 'UNSUPPORTED_RESOURCE', '暂不支持蓝奏云文件夹分享链接')
  }
  if (pathSegments.length !== 1 || !LANZOU_FILE_ID_PATTERN.test(fileId)) {
    throw createError('input', 400, 'INVALID_URL', 'url 必须指向单个蓝奏云分享文件')
  }

  return new URL(`https://${LANZOU_HOST}/${fileId}`)
}

function parseFileMetadata(html: string): { name: string, size: string } {
  const $ = cheerio.load(html)
  const nameCandidates = [
    $('#filenajax').first().text(),
    $('.n_box_3fn').first().text(),
    $('[style*="font-size: 30px"]').first().text(),
    html.match(/var\s+filename\s*=\s*['"]([^'"]+)['"]/i)?.[1] || '',
    $('.b > span').first().text()
  ]
  const name = nameCandidates
    .map(normalizeVisibleText)
    .find(value => value && value !== '文件') || ''

  const sizeCandidates = [
    $('.n_filesize').first().text().replace(/^\s*大小[：:]\s*/u, ''),
    html.match(/<span[^>]*class=["']p7["'][^>]*>\s*文件大小[：:]\s*<\/span>\s*([^<]+)/iu)?.[1] || ''
  ]
  const size = sizeCandidates.map(normalizeVisibleText).find(Boolean) || ''
  return { name, size }
}

function assertShareAvailable(html: string): void {
  const text = normalizeVisibleText(cheerio.load(html).text())
  if (/文件(?:已)?取消分享|文件不存在|来晚了.*?文件/i.test(text)) {
    throw createError('business', 422, 'SHARE_UNAVAILABLE', '该蓝奏云文件不存在或已取消分享')
  }
}

function readScriptValue(source: string, variable: string): string {
  const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.match(new RegExp(`\\b${escapedVariable}\\s*=\\s*['"]([^'"]+)['"]`))?.[1] || ''
}

function readAjaxPath(source: string): string {
  return [...source.matchAll(/['"]?(\/ajaxm\.php\?file=\d+)['"]?/g)].at(-1)?.[1] || ''
}

function createPasswordForm(html: string, password: string): { path: string, body: URLSearchParams } {
  const signs = [...html.matchAll(/['"]sign['"]\s*:\s*['"]([^'"]+)['"]\s*,\s*['"]kd['"]/g)]
    .map(match => match[1] || '')
    .filter(sign => sign && sign !== '<1>')
  const sign = signs.at(-1) || ''
  const path = readAjaxPath(html)
  if (!path || !sign) {
    throw createError('business', 422, 'PARSE_FAILED', '蓝奏云分享页结构已变化，暂时无法解析')
  }

  return {
    path,
    body: new URLSearchParams({ action: 'downprocess', sign, p: password, kd: '1' })
  }
}

function createPublicForm(html: string): { path: string, body: URLSearchParams } {
  const sign = readScriptValue(html, 'wp_sign')
  const ajaxData = readScriptValue(html, 'ajaxdata')
  const path = readAjaxPath(html)
  if (!path || !sign || !ajaxData) {
    throw createError('business', 422, 'PARSE_FAILED', '蓝奏云下载页结构已变化，暂时无法解析')
  }

  return {
    path,
    body: new URLSearchParams({
      action: 'downprocess',
      websignkey: ajaxData,
      signs: ajaxData,
      sign,
      websign: '',
      kd: '1',
      ves: '1'
    })
  }
}

async function fetchHtml(url: URL, referer: URL | undefined, signal?: AbortSignal): Promise<string> {
  const response = await safeFetch(url, {
    allowedHosts: LANZOU_ALLOWED_HOSTS,
    headers: {
      ...REQUEST_HEADERS,
      ...(referer ? { referer: referer.toString() } : {})
    },
    signal: signal ?? AbortSignal.timeout(10_000)
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`蓝奏云返回 HTTP ${response.status}`)
  }
  return readLimitedText(response, MAX_HTML_BYTES)
}

function parseDownloadResponse(payload: unknown, usedPassword: boolean): { name: string, downloadUrl: string } {
  if (!isRecord(payload)) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', '蓝奏云返回了无效数据')
  }

  if (payload.zt !== 1 && payload.zt !== '1') {
    const upstreamMessage = readText(payload.inf)
    if (usedPassword && /密码|不正确|错误/u.test(upstreamMessage)) {
      throw createError('business', 422, 'INVALID_PASSWORD', '蓝奏云分享密码不正确')
    }
    if (/取消|不存在|失效/u.test(upstreamMessage)) {
      throw createError('business', 422, 'SHARE_UNAVAILABLE', '该蓝奏云文件不存在或已取消分享')
    }
    throw createError('business', 422, 'PARSE_FAILED', '蓝奏云未返回可用的下载地址')
  }

  const domain = parseHttpsUrl(readText(payload.dom, 2_048), isKnownDownloadHostname)
  const path = readText(payload.url, 8_192).replace(/^\/+/, '')
  if (!domain || domain.pathname !== '/' || domain.search || domain.hash || !path) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', '蓝奏云返回了无效的下载地址')
  }
  const downloadUrl = new URL(`/file/${path}`, domain)
  if (!downloadUrl.pathname.startsWith('/file/')) {
    throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', '蓝奏云返回了无效的下载地址')
  }
  downloadUrl.searchParams.delete('pid')

  return {
    name: readText(payload.inf),
    downloadUrl: downloadUrl.toString()
  }
}

export async function parseLanzouFile(sourceUrl: URL, password = '', signal?: AbortSignal): Promise<LanzouFileData> {
  try {
    const shareHtml = await fetchHtml(sourceUrl, undefined, signal)
    assertShareAvailable(shareHtml)
    const metadata = parseFileMetadata(shareHtml)
    const passwordProtected = /function\s+down_p\s*\(/.test(shareHtml)

    let form: { path: string, body: URLSearchParams }
    let referer = sourceUrl
    if (passwordProtected) {
      if (!password) {
        throw createError('input', 400, 'PASSWORD_REQUIRED', '该蓝奏云文件需要提供 pwd 分享密码')
      }
      form = createPasswordForm(shareHtml, password)
    } else {
      const iframeSource = cheerio.load(shareHtml)('iframe[src]').first().attr('src') || ''
      let iframeUrl: URL | null = null
      try {
        iframeUrl = parseHttpsUrl(new URL(iframeSource, sourceUrl).toString(), host => host === LANZOU_HOST)
      } catch {
        // Invalid iframe URLs are handled as an upstream page-structure change below.
      }
      if (!iframeSource || !iframeUrl) {
        throw createError('business', 422, 'PARSE_FAILED', '蓝奏云分享页结构已变化，暂时无法解析')
      }
      const downloadHtml = await fetchHtml(iframeUrl, sourceUrl, signal)
      form = createPublicForm(downloadHtml)
      referer = iframeUrl
    }

    const response = await safeFetch(new URL(form.path, sourceUrl), {
      allowedHosts: LANZOU_ALLOWED_HOSTS,
      method: 'POST',
      headers: {
        ...REQUEST_HEADERS,
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'referer': referer.toString(),
        'x-requested-with': 'XMLHttpRequest'
      },
      body: form.body,
      signal: signal ?? AbortSignal.timeout(10_000)
    })
    if (!response.ok) {
      await response.body?.cancel()
      throw new Error(`蓝奏云下载接口返回 HTTP ${response.status}`)
    }

    let payload: unknown
    try {
      payload = JSON.parse(await readLimitedText(response, MAX_JSON_BYTES)) as unknown
    } catch (error) {
      throw createError('upstream', 502, 'UPSTREAM_INVALID_RESPONSE', '蓝奏云返回了无效数据', { cause: error })
    }
    const result = parseDownloadResponse(payload, passwordProtected)
    return {
      name: result.name || metadata.name,
      size: metadata.size,
      url: result.downloadUrl
    }
  } catch (error) {
    if (error instanceof LanzouError) throw error
    throw createError('upstream', 502, 'UPSTREAM_ERROR', '请求蓝奏云服务失败', { cause: error })
  }
}

export function classifyLanzouError(error: unknown): LanzouFailure {
  if (error instanceof LanzouError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      biz: error.kind !== 'input'
    }
  }
  return { status: 502, code: 'UPSTREAM_ERROR', message: '请求蓝奏云服务失败', biz: true }
}
