/**
 * 图片解析：从豆包对话链接（/thread/）或千问分享链接（/share/chat/）提取图片资源。
 * 移植自参考实现 dist/doubao-nomark/doubao_parser/image.py，逻辑与上游接口保持一致。
 *
 * 上游 JSON 结构不可控，统一以 unknown 收口、用 asRecord/asArray 逐层安全取值——
 * 结构变化时静默退化为「空结果」而非抛错（对齐参考实现「尽力提取」的语义）。
 * raw=true 时直接返回上游原始数据，便于调试与结构变更排查。
 */

import { fetchJson, fetchText } from './http'
import {
  asArray,
  asRecord,
  asString,
  DoubaoError,
  type DoubaoImage
} from './types'

const DOUBAO_HEADERS: Record<string, string> = {
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0'
}

const QIANWEN_HEADERS: Record<string, string> = {
  'origin': 'https://www.qianwen.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0'
}

/**
 * 页面内嵌对话数据的两种载体（按顺序匹配，取首个命中）：
 *  1. modern-run-router-data-fn —— 数组元素形如 { data: { message_snapshot } }
 *  2. mergeLoaderData          —— 数组元素形如 [{ routerDataFnArgs: [JSON 字符串] }]
 * 两者 data-fn-args 均为 &quot; 转义的 JSON；解析后按元素形态在 doubaoImageParse 内分流。
 */
const DOUBAO_DATA_RES: RegExp[] = [
  /data-script-src="modern-run-router-data-fn" data-fn-args="([\s\S]*?)" nonce="/,
  /data-script-src="modern-run-window-fn" data-fn-name="mergeLoaderData" data-fn-args="([\s\S]*?)" nonce="/
]

/**
 * 从 message_snapshot.message_list 中提取无水印原图，追加到 images。
 * 每条 message 的 content_block[].content_v2（缺省回退 content）可能是 JSON 字符串；
 * 解析后 creation_block.creations[].image.image_ori_raw 即原图（url 需反转义 &amp;）。
 */
function collectImages(messageSnapshot: unknown, images: DoubaoImage[]): void {
  for (const message of asArray(asRecord(messageSnapshot).message_list)) {
    for (const block of asArray(asRecord(message).content_block)) {
      const b = asRecord(block)
      const rawContent = b.content_v2 || b.content // content_v2 优先，缺省回退 content
      let parsed: unknown = rawContent
      if (typeof rawContent === 'string') {
        try {
          parsed = JSON.parse(rawContent)
        } catch {
          continue
        }
      }
      for (const creation of asArray(asRecord(asRecord(parsed).creation_block).creations)) {
        const imageOriRaw = asRecord(asRecord(asRecord(creation).image).image_ori_raw)
        const imageUrl = asString(imageOriRaw.url)
        if (!imageUrl) continue
        imageOriRaw.url = imageUrl.replace(/&amp;/g, '&')
        images.push(imageOriRaw as DoubaoImage)
      }
    }
  }
}

/** 解析豆包对话链接中的图片。raw=true 时返回页面内嵌的原始 JSON。 */
export async function doubaoImageParse(url: string, raw = false): Promise<DoubaoImage[] | unknown> {
  if (!url.includes('doubao.com/thread/')) {
    throw new DoubaoError('input', 400, 'INVALID_PARAMETER', '链接格式不正确，请使用豆包对话链接（包含 /thread/）')
  }

  const html = await fetchText(url, { headers: DOUBAO_HEADERS })
  let match: RegExpExecArray | null = null
  for (const re of DOUBAO_DATA_RES) {
    match = re.exec(html)
    if (match) break
  }
  if (!match) {
    throw new DoubaoError('business', 502, 'PARSE_FAILED', '无法解析页面数据，请确认链接是否有效')
  }

  let json: unknown
  try {
    json = JSON.parse(match[1]!.replace(/&quot;/g, '"'))
  } catch {
    throw new DoubaoError('business', 502, 'PARSE_FAILED', '页面数据格式错误，无法解析')
  }

  if (raw) return json

  const images: DoubaoImage[] = []
  for (const item of asArray(json)) {
    // 列表分支：item = [{ routerDataFnArgs: [JSON 字符串] }]，message_snapshot 藏在该字符串里
    if (Array.isArray(item)) {
      const firstArg = asArray(asRecord(item[0]).routerDataFnArgs)[0]
      if (typeof firstArg !== 'string') continue
      let routerData: unknown
      try {
        routerData = JSON.parse(firstArg)
      } catch {
        continue
      }
      collectImages(asRecord(asRecord(routerData).data).message_snapshot, images)
      continue
    }
    // 字典分支：item = { data: { message_snapshot } }
    collectImages(asRecord(asRecord(item).data).message_snapshot, images)
  }
  return images
}

/** 解析千问分享链接中的图片。raw=true 时返回上游 share/info 接口的原始响应。 */
export async function qianwenImageParse(url: string, raw = false): Promise<DoubaoImage[] | unknown> {
  if (!url.includes('qianwen.com/share/chat/')) {
    throw new DoubaoError('input', 400, 'INVALID_PARAMETER', '链接格式不正确，请使用千问分享链接（包含 qianwen.com/share/chat/）')
  }

  const shareId = url.split('?')[0]!.split('chat/').pop() ?? ''
  const data = await fetchJson('https://chat2-api.qianwen.com/api/v1/share/info', {
    method: 'POST',
    headers: QIANWEN_HEADERS,
    body: { share_id: shareId, biz_id: 'ai_qwen' }
  })

  if (raw) return data

  const images: DoubaoImage[] = []
  const recordList = asArray(asRecord(asRecord(asRecord(data).data).session).record_list)
  for (const record of recordList) {
    const responseMessages = asArray(asRecord(record).response_messages)
    for (const message of responseMessages) {
      const m = asRecord(message)
      if (m.mime_type !== 'multi_load/iframe' || m.status !== 'complete') continue
      const multiLoad = asArray(asRecord(m.meta_data).multi_load)
      for (const item of multiLoad) {
        const displayList = asArray(asRecord(asRecord(item).content).display_list)
        for (const display of displayList) {
          const imageInfo = asArray(asRecord(display).image)[0]
          if (imageInfo) images.push(asRecord(imageInfo) as DoubaoImage)
        }
      }
    }
  }
  return images
}
