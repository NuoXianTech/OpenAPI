/**
 * 视频解析：从豆包视频分享链接或云雀（剪映）分享短链提取可播放视频。
 * 移植自参考实现 dist/doubao-nomark/doubao_parser/video.py，逻辑与上游接口保持一致。
 *
 * - 豆包：/thread/ 链接从 HTML 抓 vid 列表；video_id= 链接直接取参；再逐个调 get_play_info
 * - 云雀：跟随短链 302 → 从最终 URL 取 share_id 等参数 → 调 landing_page
 * - raw=true 时返回上游原始响应，便于调试与结构变更排查
 */

import { fetchJson, fetchText, resolveRedirect } from './http'
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  createDoubaoError,
  type DoubaoVideo
} from './types'

const DOUBAO_HTML_HEADERS: Record<string, string> = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,'
    + 'application/signed-exchange;v=b3;q=0.7',
  'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,en-GB;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0'
}

const DOUBAO_PLAY_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/126.0.0.0 Safari/537.36 NetType/WIFI MicroMessenger/7.0.20.1781(0x6700143B) '
    + 'WindowsWechat(0x63090c33) XWEB/14315 Flue',
  'origin': 'https://www.doubao.com'
}

const DOUBAO_PLAY_PARAMS: Record<string, string> = {
  'version_code': '20800',
  'language': 'zh-CN',
  'device_platform': 'web',
  'aid': '497858',
  'real_aid': '497858',
  'pkg_type': 'release_version',
  'device_id': '',
  'pc_version': '2.51.7',
  'region': '',
  'sys_region': '',
  'samantha_web': '1',
  'use-olympus-account': '1',
  'web_tab_id': ''
}

const YUNQUE_HEADERS: Record<string, string> = {
  'content-type': 'application/json',
  'origin': 'https://xiaoyunque.jianying.com',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/145.0.0.0 Safari/537.36'
}

const YUNQUE_REDIRECT_HEADERS: Record<string, string> = {
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/145.0.0.0 Safari/537.36'
}

/** 豆包 HTML 内嵌的 vid 形如 {\&quot;vid\&quot;:\&quot;xxx\&quot；去重返回。 */
const DOUBAO_VID_RE = /\{\\&quot;vid\\&quot;:\\&quot;(.*?)\\&quot/g

async function getDoubaoVids(url: string, signal?: AbortSignal): Promise<string[]> {
  const html = await fetchText(url, { headers: DOUBAO_HTML_HEADERS, signal })
  const vids = new Set<string>()
  for (const match of html.matchAll(DOUBAO_VID_RE)) {
    if (match[1]) vids.add(match[1])
  }
  return [...vids]
}

/** 解析豆包视频。raw=true 时返回首个 vid 的 get_play_info 原始响应。 */
export async function doubaoVideoParse(url: string, raw = false, signal?: AbortSignal): Promise<DoubaoVideo[] | unknown> {
  let vids: string[]
  if (url.includes('/thread/')) {
    vids = await getDoubaoVids(url, signal)
  } else if (url.includes('video_id=')) {
    vids = new URL(url).searchParams.getAll('video_id')
  } else {
    throw createDoubaoError('input', 400, 'INVALID_PARAMETER', '链接中缺少 video_id 参数，请检查链接是否正确')
  }

  const videos: DoubaoVideo[] = []
  for (const vid of vids) {
    const result = await fetchJson('https://www.doubao.com/samantha/media/get_play_info', {
      method: 'POST',
      query: DOUBAO_PLAY_PARAMS,
      headers: DOUBAO_PLAY_HEADERS,
      body: { key: vid },
      signal
    })

    const root = asRecord(result)
    if (!('data' in root)) {
      throw createDoubaoError('business', 502, 'PARSE_FAILED', 'API 返回数据格式异常，可能链接已失效')
    }
    if (raw) return result

    const data = asRecord(root.data)
    const original = asRecord(data.original_media_info)
    const meta = asRecord(original.meta)
    videos.push({
      width: asNumber(meta.width),
      height: asNumber(meta.height),
      definition: asString(meta.definition),
      duration: asNumber(meta.duration),
      codec_type: asString(meta.codec_type),
      poster_url: asString(data.poster_url),
      url: asString(original.main_url)
    })
  }
  return videos
}

/** 解析云雀（剪映）分享视频。raw=true 时返回 landing_page 原始响应。 */
export async function yunqueVideoParse(url: string, raw = false, signal?: AbortSignal): Promise<DoubaoVideo[] | unknown> {
  const finalUrl = await resolveRedirect(url, { headers: YUNQUE_REDIRECT_HEADERS, signal })
  const params = new URL(finalUrl).searchParams
  const shareId = params.get('share_id')
  const shareSecDid = params.get('share_sec_did')
  const shareSecUid = params.get('share_sec_uid')
  if (!shareId || !shareSecDid || !shareSecUid) {
    throw createDoubaoError('business', 502, 'PARSE_FAILED', '无法从链接解析分享参数，请确认链接是否有效')
  }

  const result = await fetchJson(
    'https://xiaoyunque.jianying.com/luckycat/cn/jianying/campaign/v1/pippit/share/landing_page',
    {
      method: 'POST',
      headers: YUNQUE_HEADERS,
      body: {
        query_params: {
          content_type: 'video',
          home_input_type: 'VIDEO_PART',
          scene: 'agent_tool',
          share_campaign_key: 'pippit_invite_fission',
          share_id: shareId,
          share_sec_did: shareSecDid,
          share_sec_uid: shareSecUid
        }
      },
      signal
    }
  )

  const root = asRecord(result)
  if (!('data' in root)) {
    throw createDoubaoError('business', 502, 'PARSE_FAILED', 'API 返回数据格式异常，可能链接已失效')
  }
  const data = asRecord(root.data)
  if (!('page_info' in data)) {
    throw createDoubaoError('business', 502, 'PARSE_FAILED', '无法获取视频播放信息，请检查链接是否有效')
  }
  if (raw) return result

  const videoInfoList = asArray(
    asRecord(asRecord(asRecord(data.page_info).generate_page).item_info).video_info
  )
  const videoInfo = asRecord(videoInfoList[0])
  if (videoInfoList.length === 0) {
    throw createDoubaoError('business', 502, 'PARSE_FAILED', '未找到视频信息，请检查链接是否有效')
  }

  const width = asNumber(videoInfo.width)
  return [{
    url: asString(videoInfo.video_url),
    width,
    height: asNumber(videoInfo.height),
    definition: `${width}p`,
    poster_url: asString(videoInfo.cover_url)
  }]
}
