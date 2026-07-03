/**
 * GET /v1/yiyan · 随机返回一句「一言」。
 *
 * Query（全部可选）：
 *   type        句子类型 a|b|c|d|e|f|g|h|i|n|z；缺省 / 非法 → a（动画）
 *   encode      返回编码 text|json|js|md；缺省 / 其他 → json
 *   charset     字符集 utf-8|gbk；缺省 / 其他 → utf-8（gbk 不可与 callback 同用）
 *   callback    JSONP 异步函数名（合法 JS 标识符）；给定即走 JSONP，优先级高于 encode
 *   select      encode=js 时注入文本的 CSS 选择器，默认 .yiyan
 *   min_length  句子最小长度（含），默认 0
 *   max_length  句子最大长度（含），默认 30
 *   id          指定复合 id（如 a1）查看该句完整信息；未命中 → 404
 *
 * 响应分工（见 docs/api/conventions.md §4.0 内容协商型接口）：
 *   - encode=json（含默认）→ 套标准 openApiResponse 壳，data 为句子记录；
 *     JSONP（callback）属 json 表示的变体，包裹的也是这同一个标准壳：callback({code,...,data})
 *   - encode=text|js|md → 各接口自定义原始格式，直出内容并自设 Content-Type
 *   - charset 只决定字节编码（gbk 走 iconv），不改变结构
 *   - 参数错误（400）/ 未命中（404）一律走 openApiFail 标准壳，不受 encode 影响
 *
 * 注：gate 中间件要求后台已登记 (v1, yiyan)，否则 403 API_NOT_REGISTERED；
 * 作为公共接口应配 isApiKey=false 且 methodCosts.GET=0（免鉴权免扣费）。
 */

import type { H3Event } from 'h3'
import { getQuery, setResponseHeader } from 'h3'
import { openApiFail, openApiOk } from '~~/server/utils/open-api-response'
import { ensureRequestId } from '~~/server/utils/request-id'
import {
  DEFAULT_MAX_LENGTH,
  DEFAULT_MIN_LENGTH,
  DEFAULT_YIYAN_CHARSET,
  DEFAULT_YIYAN_ENCODE,
  DEFAULT_YIYAN_SELECT,
  DEFAULT_YIYAN_TYPE,
  isYiyanEncode,
  isYiyanType,
  type YiyanCharset,
  type YiyanEncode,
  type YiyanType
} from '~~/server/lib/yiyan/types'
import { pickSentence } from '~~/server/lib/yiyan/repository'
import {
  contentTypeFor,
  encodeBody,
  formatJs,
  formatMd,
  formatText,
  isValidCallback,
  toRecord,
  wrapJsonp
} from '~~/server/lib/yiyan/format'

/** getQuery 的值可能是 string | string[] | undefined，统一取首个并转字符串。 */
function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0])
  return value === undefined || value === null ? '' : String(value)
}

function parseLength(value: unknown, fallback: number): number {
  const s = firstString(value).trim()
  if (s === '') return fallback
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event)

  const typeRaw = firstString(query.type).trim().toLowerCase()
  const type: YiyanType = isYiyanType(typeRaw) ? typeRaw : DEFAULT_YIYAN_TYPE

  const encodeRaw = firstString(query.encode).trim().toLowerCase()
  const encode: YiyanEncode = isYiyanEncode(encodeRaw) ? encodeRaw : DEFAULT_YIYAN_ENCODE

  const charset: YiyanCharset = firstString(query.charset).trim().toLowerCase() === 'gbk'
    ? 'gbk'
    : DEFAULT_YIYAN_CHARSET

  const callback = firstString(query.callback).trim()
  const select = firstString(query.select).trim() || DEFAULT_YIYAN_SELECT
  const minLength = parseLength(query.min_length, DEFAULT_MIN_LENGTH)
  const maxLength = parseLength(query.max_length, DEFAULT_MAX_LENGTH)
  const id = firstString(query.id).trim() || null

  if (minLength > maxLength) {
    return openApiFail(event, 400, 'INVALID_PARAMETER', `min_length(${minLength}) 不能大于 max_length(${maxLength})`)
  }

  const useJsonp = callback.length > 0
  if (useJsonp) {
    if (!isValidCallback(callback)) {
      return openApiFail(event, 400, 'INVALID_PARAMETER', 'callback 必须是合法的 JS 函数名')
    }
    if (charset === 'gbk') {
      return openApiFail(event, 400, 'INVALID_PARAMETER', 'charset=gbk 不支持与 callback（异步函数）同用')
    }
  }

  const sentence = await pickSentence({ type, minLength, maxLength, id })
  if (!sentence) {
    const message = id ? `未找到一言` : `暂无符合条件的一言`
    return openApiFail(event, 404, 'YIYAN_NOT_FOUND', message)
  }

  const record = toRecord(sentence, type)

  // 每次随机，禁止 CDN / 浏览器缓存固定同一句
  setResponseHeader(event, 'cache-control', 'no-store')

  // encode=json（含默认）→ 标准 openApiResponse 壳；JSONP 包裹同一个壳。
  if (useJsonp || encode === 'json') {
    const envelope = openApiOk(event, record, '获取一言成功') // 设置 200 + X-Request-Id，返回标准壳对象
    if (useJsonp) {
      setResponseHeader(event, 'content-type', contentTypeFor('jsonp', charset))
      return encodeBody(wrapJsonp(callback, JSON.stringify(envelope)), charset)
    }
    if (charset === 'gbk') {
      setResponseHeader(event, 'content-type', contentTypeFor('json', charset))
      return encodeBody(JSON.stringify(envelope), charset)
    }
    return envelope // utf-8 标准路径：交由 Nitro 序列化为 application/json
  }

  // 其他 encode（text/js/md）→ 各接口自定义原始格式
  let body: string
  switch (encode) {
    case 'text':
      body = formatText(record)
      break
    case 'js':
      body = formatJs(record, select)
      break
    default: // 'md'（'json' 已在上方返回）
      body = formatMd(record)
  }
  setResponseHeader(event, 'content-type', contentTypeFor(encode, charset))
  setResponseHeader(event, 'x-request-id', ensureRequestId(event))
  return encodeBody(body, charset)
})
