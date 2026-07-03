/**
 * yiyan 多格式输出 + 字符集编码 + JSONP 包装。
 *
 * 成功响应直出原始内容（非 openApiResponse JSON 壳），见 docs/api/public-api-conventions.md §4 例外。
 */

import { Buffer } from 'node:buffer'
import iconv from 'iconv-lite'
import type { YiyanCharset, YiyanEncode, YiyanRecord, YiyanSentence, YiyanType } from './types'

/** 原始句子 → 对外输出：id 变为「类型+原始id」复合串（如 a1），length 缺失时按码点数兜底。 */
export function toRecord(sentence: YiyanSentence, type: YiyanType): YiyanRecord {
  return {
    id: `${type}${sentence.id}`,
    yiyan: sentence.yiyan,
    type: sentence.type || type,
    from: sentence.from ?? null,
    from_who: sentence.from_who ?? null,
    created_at: sentence.created_at,
    length: typeof sentence.length === 'number' ? sentence.length : [...sentence.yiyan].length
  }
}

export function formatText(record: YiyanRecord): string {
  return record.yiyan
}

/** encode=js：生成把句子文本写入 select 命中元素的同步 IIFE。文本与选择器均经 JSON.stringify 转义防注入。 */
export function formatJs(record: YiyanRecord, select: string): string {
  const text = JSON.stringify(record.yiyan)
  const selector = JSON.stringify(select)
  return `(function(){var t=${text};var els=document.querySelectorAll(${selector});`
    + `for(var i=0;i<els.length;i++){els[i].innerText=t}})()`
}

/** encode=md：引用块 + 出处署名。 */
export function formatMd(record: YiyanRecord): string {
  const lines = [`> ${record.yiyan}`]
  let attribution = ''
  if (record.from_who && record.from) attribution = `${record.from_who}「${record.from}」`
  else if (record.from) attribution = `「${record.from}」`
  else if (record.from_who) attribution = record.from_who
  if (attribution) {
    lines.push('>', `> —— ${attribution}`)
  }
  return lines.join('\n')
}

const CALLBACK_RE = /^[A-Za-z_$][\w$]*$/

/** callback 必须是合法 JS 函数名，防止 JSONP 注入。 */
export function isValidCallback(name: string): boolean {
  return CALLBACK_RE.test(name)
}

export function wrapJsonp(callback: string, jsonText: string): string {
  return `${callback}(${jsonText})`
}

/** 按字符集把字符串编码成字节：gbk 走 iconv-lite，其余 utf-8。 */
export function encodeBody(text: string, charset: YiyanCharset): Buffer {
  return charset === 'gbk' ? iconv.encode(text, 'gbk') : Buffer.from(text, 'utf-8')
}

/** 解析响应 Content-Type（含字符集）。jsonp 与 js 同归 application/javascript。 */
export function contentTypeFor(encode: YiyanEncode | 'jsonp', charset: YiyanCharset): string {
  const cs = charset === 'gbk' ? 'gbk' : 'utf-8'
  switch (encode) {
    case 'text':
      return `text/plain; charset=${cs}`
    case 'md':
      return `text/markdown; charset=${cs}`
    case 'js':
    case 'jsonp':
      return `application/javascript; charset=${cs}`
    default:
      return `application/json; charset=${cs}`
  }
}
