import { createHash } from 'node:crypto'
import { buildUrl, isRecord, normalizeCollection, readNumber, readPath, readString, requestJson, splitArtists } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack } from './types'
import { getMusicPlatformCookie } from './capability-config'

const BASE_HEADERS = { 'user-agent': 'IPhone-8990-searchSong', 'uni-useragent': 'iOS11.4-Phone8990-1009-0-WiFi' }
const SIGNATURE_KEY = 'NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'
const MOBILE_API = 'https://mobileservice.kugou.com/api/v3'

function parseCookie(cookie: string): Record<string, string> {
  return Object.fromEntries(cookie.split(';').flatMap((entry) => {
    const separatorIndex = entry.indexOf('=')
    if (separatorIndex <= 0) return []
    return [[entry.slice(0, separatorIndex).trim(), entry.slice(separatorIndex + 1).trim()]]
  }))
}

function createKugouSignature(params: Record<string, string>): string {
  const sorted = Object.entries(params).map(([key, value]) => `${key}=${value}`).sort().join('')
  return createHash('md5').update(`${SIGNATURE_KEY}${sorted}${SIGNATURE_KEY}`).digest('hex')
}

function createKugouSongInfoUrl(params: Record<string, string>): string {
  const url = new URL('https://wwwapi.kugou.com/play/songinfo')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('signature', createKugouSignature(params))
  return url.toString()
}

function normalizeKugou(value: unknown): MusicTrack | null {
  if (!isRecord(value)) return null
  const id = readString(value.hash)
  const filename = readString(value.filename || value.fileName)
  const parts = filename.split(' - ')
  const name = readString(value.songName, parts[1] || filename)
  if (!id || !name) return null
  const authors = Array.isArray(value.authors) ? value.authors.map(item => isRecord(item) ? readString(item.author_name) : '').filter(Boolean) : splitArtists(parts[0], '、')
  return { id, name, artists: authors, album: readString(value.album_name), pictureId: id, audioId: readString(value.encode_album_audio_id, id), lyricsId: id, platform: 'kugou' }
}

async function get(url: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<unknown> {
  return requestJson(buildUrl(url, params), { headers: BASE_HEADERS, signal })
}

function normalizeKugouCollection(payload: unknown): MusicTrack[] {
  if (!isRecord(payload)) throw new Error('酷狗音乐上游返回了无效数据')
  const status = readNumber(payload.status, -1)
  const errorCode = readNumber(payload.errcode ?? payload.error_code, -1)
  if (status !== 1 || errorCode !== 0) {
    const message = readString(payload.error || payload.message).trim()
    throw new Error(`酷狗音乐上游返回业务错误（status=${status}, error_code=${errorCode}${message ? `, ${message}` : ''}）`)
  }
  if (!Array.isArray(readPath(payload, 'data.info'))) throw new Error('酷狗音乐上游未返回歌曲列表')
  return normalizeCollection(payload, 'data.info', normalizeKugou)
}

export async function searchKugou(keyword: string, page: number, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const payload = await get(`${MOBILE_API}/search/song`, { api_ver: 1, area_code: 1, correct: 1, pagesize: limit, plat: 2, tag: 1, sver: 5, showtype: 10, page, keyword, version: 8990 }, signal)
  return normalizeKugouCollection(payload)
}

export async function getKugouTracks(operation: 'song' | 'album' | 'playlist', id: string, signal?: AbortSignal): Promise<MusicTrack[]> {
  if (operation === 'song') {
    const payload = await requestJson('https://m.kugou.com/app/i/getSongInfo.php', {
      method: 'POST',
      headers: { ...BASE_HEADERS, 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ cmd: 'playInfo', hash: id, from: 'mkugou' }),
      signal
    })
    return normalizeCollection(payload, '', normalizeKugou)
  }
  const isAlbum = operation === 'album'
  const payload = await get(`${MOBILE_API}/${isAlbum ? 'album' : 'special'}/song`, { [isAlbum ? 'albumid' : 'specialid']: id, area_code: 1, page: 1, plat: 2, pagesize: 200, version: 8990 }, signal)
  return normalizeKugouCollection(payload)
}

export async function getKugouArtist(id: string, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const payload = await get(`${MOBILE_API}/singer/song`, { singerid: id, area_code: 1, page: 1, plat: 0, pagesize: limit, version: 8990 }, signal)
  return normalizeKugouCollection(payload)
}

export async function getKugouUrl(id: string, bitrate: number, signal?: AbortSignal): Promise<MusicResourceUrl> {
  const configuredCookie = await getMusicPlatformCookie('kugou')
  const cookie = parseCookie(configuredCookie)
  if (cookie.t && cookie.KugooID) {
    const token = cookie.t
    const userId = cookie.KugooID
    const createParams = (identifier: { hash?: string, encodeAlbumAudioId?: string }) => ({
      srcappid: '2919',
      clientver: '20000',
      clienttime: String(Date.now()),
      mid: cookie.mid || cookie.kg_mid || '',
      uuid: cookie.uuid || cookie.mid || cookie.kg_mid || '',
      dfid: cookie.dfid || cookie.kg_dfid || '',
      appid: '1014',
      platid: '4',
      ...(identifier.hash ? { hash: identifier.hash } : {}),
      ...(identifier.encodeAlbumAudioId ? { encode_album_audio_id: identifier.encodeAlbumAudioId } : {}),
      token,
      userid: userId
    })
    const headers = { ...BASE_HEADERS, cookie: configuredCookie }
    const first = await requestJson(createKugouSongInfoUrl(createParams({ hash: id })), { headers, signal })
    const encodeAlbumAudioId = readString(readPath(first, 'data.encode_album_audio_id'))
    if (encodeAlbumAudioId) {
      const detail = await requestJson(
        createKugouSongInfoUrl(createParams({ encodeAlbumAudioId })),
        { headers, signal }
      )
      const url = readString(readPath(detail, 'data.play_url') || readPath(detail, 'data.play_backup_url'))
      if (url) {
        return {
          url: url.replace(/^http:/, 'https:'),
          size: readNumber(readPath(detail, 'data.filesize')),
          br: readNumber(readPath(detail, 'data.bitrate')) / 1000
        }
      }
    }
  }

  const privilege = await requestJson('http://media.store.kugou.com/v1/get_res_privilege', {
    method: 'POST',
    headers: { ...BASE_HEADERS, 'content-type': 'application/json' },
    body: JSON.stringify({ relate: 1, userid: '0', vip: 0, appid: 1000, token: '', behavior: 'download', area_code: '1', clientver: '8990', resource: [{ id: 0, type: 'audio', hash: id }] }),
    signal
  })
  if (!isRecord(privilege)) throw new Error('酷狗音乐权限上游返回了无效数据')
  const privilegeStatus = readNumber(privilege.status, -1)
  const privilegeErrorCode = readNumber(privilege.error_code, -1)
  if (privilegeStatus !== 1 || privilegeErrorCode !== 0) {
    throw new Error(`酷狗音乐权限上游返回业务错误（status=${privilegeStatus}, error_code=${privilegeErrorCode}）`)
  }
  const goods = readPath(privilege, 'data.0.relate_goods')
  if (!Array.isArray(goods)) return { url: '', size: 0, br: -1 }
  const candidates = goods.filter(isRecord).filter(item => readNumber(readPath(item, 'info.bitrate')) <= bitrate).sort((a, b) => readNumber(readPath(b, 'info.bitrate')) - readNumber(readPath(a, 'info.bitrate')))
  for (const candidate of candidates) {
    const hash = readString(candidate.hash)
    if (!hash) continue
    const payload = await get('https://trackercdn.kugou.com/i/v2/', { hash, key: createHash('md5').update(`${hash}kgcloudv2`).digest('hex'), pid: 3, behavior: 'play', cmd: '25', version: 8990 }, signal)
    const urls = isRecord(payload) ? payload.url : undefined
    const url = Array.isArray(urls) ? readString(urls[0]) : readString(urls)
    if (url) return { url: url.replace(/^http:/, 'https:'), size: readNumber(isRecord(payload) ? payload.fileSize : 0), br: readNumber(isRecord(payload) ? payload.bitRate : 0) / 1000 }
  }
  return { url: '', size: 0, br: -1 }
}

export async function getKugouLyrics(id: string, signal?: AbortSignal): Promise<MusicLyrics> {
  const search = await get('https://krcs.kugou.com/search', { keyword: ' - ', ver: 1, hash: id, client: 'mobi', man: 'yes' }, signal)
  const candidate = readPath(search, 'candidates.0')
  if (!isRecord(candidate)) return { lyric: '', tlyric: '' }
  const download = await get('https://lyrics.kugou.com/download', { charset: 'utf8', accesskey: readString(candidate.accesskey), id: readString(candidate.id), client: 'mobi', fmt: 'lrc', ver: 1 }, signal)
  const content = isRecord(download) ? download.content : undefined
  return { lyric: typeof content === 'string' ? Buffer.from(content, 'base64').toString() : '', tlyric: '' }
}

export async function getKugouPicture(id: string, signal?: AbortSignal): Promise<MusicResourceUrl> {
  const payload = await requestJson('https://m.kugou.com/app/i/getSongInfo.php', {
    method: 'POST',
    headers: { ...BASE_HEADERS, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ cmd: 'playInfo', hash: id, from: 'mkugou' }),
    signal
  })
  return { url: readString(isRecord(payload) ? payload.imgUrl : '').replace('{size}', '400').replace(/^http:/, 'https:') }
}
