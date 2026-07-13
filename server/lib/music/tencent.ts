import { buildUrl, isRecord, normalizeCollection, readNumber, readPath, readString, parseJsonResponseText, requestJson, type UnknownRecord } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack } from './types'

const HEADERS = { 'referer': 'https://y.qq.com', 'user-agent': 'QQMusic/54409 CFNetwork/901.1 Darwin/17.6.0', 'accept': '*/*' }
const API = 'https://c.y.qq.com'

function normalizeTencent(value: unknown): MusicTrack | null {
  if (!isRecord(value)) return null
  const data = isRecord(value.musicData) ? value.musicData : value
  const album = isRecord(data.album) ? data.album : {}
  const id = readString(data.mid || data.songmid)
  const name = readString(data.name || data.songname)
  if (!id || !name) return null
  const singers = Array.isArray(data.singer) ? data.singer : []
  return { id, name, artist: singers.map(item => isRecord(item) ? readString(item.name) : '').filter(Boolean), album: readString(album.title || data.albumname).trim(), pic_id: readString(album.mid || data.albummid), url_id: id, lyric_id: id, source: 'tencent' }
}

async function get(path: string, params: Record<string, string | number>): Promise<unknown> {
  return requestJson(buildUrl(path.startsWith('http') ? path : `${API}${path}`, params), { headers: HEADERS })
}

export async function searchTencent(keyword: string, page: number, limit: number): Promise<MusicTrack[]> {
  const payload = {
    comm: { ct: 19, cv: 1859, uin: '0' },
    req: {
      module: 'music.search.SearchCgiService',
      method: 'DoSearchForQQMusicDesktop',
      param: { query: keyword, num_per_page: limit, page_num: page, search_type: 0 }
    }
  }
  const data = await requestJson('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'POST',
    headers: { ...HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return normalizeCollection(data, 'req.data.body.song.list', normalizeTencent)
}

export async function getTencentTracks(operation: 'song' | 'album' | 'playlist', id: string): Promise<MusicTrack[]> {
  const requests = {
    song: ['/v8/fcg-bin/fcg_play_single_song.fcg', { songmid: id, platform: 'yqq', format: 'json' }, 'data'],
    album: ['/v8/fcg-bin/fcg_v8_album_detail_cp.fcg', { albummid: id, platform: 'mac', format: 'json', newsong: 1 }, 'data.getSongInfo'],
    playlist: ['/v8/fcg-bin/fcg_v8_playlist_cp.fcg', { id, format: 'json', newsong: 1, platform: 'jqspaframe.json' }, 'data.cdlist.0.songlist']
  } satisfies Record<string, [string, Record<string, string | number>, string]>
  const [path, params, resultPath] = requests[operation]
  return normalizeCollection(await get(path, params), resultPath, normalizeTencent)
}

export async function getTencentArtist(id: string, limit: number): Promise<MusicTrack[]> {
  const data = await get('/v8/fcg-bin/fcg_v8_singer_track_cp.fcg', { singermid: id, begin: 0, num: limit, order: 'listen', platform: 'mac', newsong: 1 })
  return normalizeCollection(data, 'data.list', normalizeTencent)
}

export async function getTencentUrl(id: string, bitrate: number): Promise<MusicResourceUrl> {
  const songPayload = await get('/v8/fcg-bin/fcg_play_single_song.fcg', { songmid: id, platform: 'yqq', format: 'json' })
  const song = readPath(songPayload, 'data.0')
  if (!isRecord(song) || !isRecord(song.file)) return { url: '', size: 0, br: -1 }
  const file = song.file
  const quality = [
    ['size_flac', 999, 'F000', 'flac'], ['size_320mp3', 320, 'M800', 'mp3'], ['size_192aac', 192, 'C600', 'm4a'],
    ['size_128mp3', 128, 'M500', 'mp3'], ['size_96aac', 96, 'C400', 'm4a'], ['size_48aac', 48, 'C200', 'm4a'], ['size_24aac', 24, 'C100', 'm4a']
  ] as const
  const mediaId = readString(file.media_mid)
  const available = quality.filter(([sizeKey, br]) => readNumber(file[sizeKey]) > 0 && br <= bitrate)
  const filenames = quality.map(([, , prefix, extension]) => `${prefix}${mediaId}.${extension}`)
  const payload = { req_0: { module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param: { guid: String(Math.floor(Math.random() * 10_000_000_000)), songmid: quality.map(() => id), filename: filenames, songtype: quality.map(() => readNumber(song.type)), uin: '0', loginflag: 1, platform: '20' } } }
  const response = await get('https://u.y.qq.com/cgi-bin/musicu.fcg', { format: 'json', platform: 'yqq.json', needNewCode: 0, data: JSON.stringify(payload) })
  const infos = readPath(response, 'req_0.data.midurlinfo')
  const sip = readPath(response, 'req_0.data.sip.0')
  if (!Array.isArray(infos) || typeof sip !== 'string') return { url: '', size: 0, br: -1 }
  for (const candidate of available) {
    const index = quality.indexOf(candidate)
    const info = infos[index]
    if (isRecord(info) && readString(info.vkey) && readString(info.purl)) return { url: `${sip}${readString(info.purl)}`, size: readNumber(file[candidate[0]]), br: candidate[1] }
  }
  return { url: '', size: 0, br: -1 }
}

function decodeEntities(value: string): string {
  const entities: Record<string, string> = { '&apos;': '\'', '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ' }
  return Object.entries(entities).reduce((text, [entity, character]) => text.replaceAll(entity, character), value)
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCharCode(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
}

export async function getTencentLyrics(id: string): Promise<MusicLyrics> {
  const response = await fetch(buildUrl(`${API}/lyric/fcgi-bin/fcg_query_lyric_new.fcg`, { songmid: id, g_tk: '5381' }), { headers: HEADERS, signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(`QQ 音乐歌词上游返回 HTTP ${response.status}`)
  const text = await response.text()
  const payload = parseJsonResponseText(text) as UnknownRecord
  const decode = (value: unknown) => typeof value === 'string' ? decodeEntities(Buffer.from(value, 'base64').toString()) : ''
  return { lyric: decode(payload.lyric), tlyric: decode(payload.trans) }
}

export function getTencentPicture(id: string, size: number): MusicResourceUrl {
  return { url: `https://y.gtimg.cn/music/photo_new/T002R${size}x${size}M000${encodeURIComponent(id)}.jpg?max_age=2592000` }
}
