import { buildUrl, isRecord, mergeCookieHeader, normalizeCollection, readNumber, readPath, readString, requestJson, splitArtists } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack } from './types'
import { getMusicPlatformCookie } from './capability-config'

const BASE_URL = 'https://www.kuwo.cn'
const DEFAULT_COOKIE = 'kw_token=3E7JFQ7MRPL'
const BASE_HEADERS = { 'csrf': '3E7JFQ7MRPL', 'referer': `${BASE_URL}/`, 'user-agent': 'Mozilla/5.0 Chrome/124 Safari/537.36' }

async function createHeaders(): Promise<Record<string, string>> {
  const cookie = await getMusicPlatformCookie('kuwo')
  const mergedCookie = mergeCookieHeader(DEFAULT_COOKIE, cookie)
  const csrf = /(?:^|;\s*)kw_token=([^;]+)/.exec(mergedCookie)?.[1] || BASE_HEADERS.csrf
  return { ...BASE_HEADERS, cookie: mergedCookie, csrf }
}

function normalizeKuwo(value: unknown): MusicTrack | null {
  if (!isRecord(value)) return null
  const id = readString(value.rid || value.musicrid).replace(/^MUSIC_/, '')
  const name = readString(value.name || value.songName)
  if (!id || !name) return null
  return { id, name, artist: splitArtists(value.artist, '&'), album: readString(value.album), pic_id: id, url_id: id, lyric_id: id, source: 'kuwo' }
}

async function get(path: string, params: Record<string, string | number>): Promise<unknown> {
  return requestJson(buildUrl(`${BASE_URL}${path}`, params), { headers: await createHeaders() })
}

export function searchKuwo(keyword: string, page: number, limit: number): Promise<MusicTrack[]> {
  return get('/api/www/search/searchMusicBykeyWord', { key: keyword, pn: page, rn: limit, httpsStatus: 1 }).then(data => normalizeCollection(data, 'data.list', normalizeKuwo))
}

export async function getKuwoTracks(operation: 'song' | 'album' | 'playlist', id: string): Promise<MusicTrack[]> {
  const requests = {
    song: ['/api/www/music/musicInfo', { mid: id, httpsStatus: 1 }, 'data'],
    album: ['/api/www/album/albumInfo', { albumId: id, pn: 1, rn: 1000, httpsStatus: 1 }, 'data.musicList'],
    playlist: ['/api/www/playlist/playListInfo', { pid: id, pn: 1, rn: 1000, httpsStatus: 1 }, 'data.musicList']
  } satisfies Record<string, [string, Record<string, string | number>, string]>
  const [path, params, resultPath] = requests[operation]
  return normalizeCollection(await get(path, params), resultPath, normalizeKuwo)
}

export function getKuwoArtist(id: string, limit: number): Promise<MusicTrack[]> {
  return get('/api/www/artist/artistMusic', { artistid: id, pn: 1, rn: limit, httpsStatus: 1 }).then(data => normalizeCollection(data, 'data.list', normalizeKuwo))
}

export async function getKuwoUrl(id: string): Promise<MusicResourceUrl> {
  const payload = await get('/api/v1/www/music/playUrl', { mid: id, type: 'music', httpsStatus: 1 })
  const url = readPath(payload, 'data.url')
  return readNumber(readPath(payload, 'code')) === 200 && typeof url === 'string' ? { url, br: 128 } : { url: '', br: -1 }
}

export async function getKuwoLyrics(id: string): Promise<MusicLyrics> {
  const payload = await requestJson(buildUrl('https://m.kuwo.cn/newh5/singles/songinfoandlrc', { musicId: id, httpsStatus: 1 }), { headers: await createHeaders() })
  const lines = readPath(payload, 'data.lrclist')
  if (!Array.isArray(lines)) return { lyric: '', tlyric: '' }
  const lyric = lines.map((item) => {
    if (!isRecord(item)) return ''
    const time = readNumber(item.time)
    const minutes = Math.floor(time / 60).toString().padStart(2, '0')
    const seconds = Math.floor(time % 60).toString().padStart(2, '0')
    const centiseconds = Math.floor((time % 1) * 100).toString().padStart(2, '0')
    return `[${minutes}:${seconds}.${centiseconds}]${readString(item.lineLyric)}`
  }).filter(Boolean).join('\n')
  return { lyric: lyric ? `${lyric}\n` : '', tlyric: '' }
}

export async function getKuwoPicture(id: string): Promise<MusicResourceUrl> {
  const payload = await get('/api/www/music/musicInfo', { mid: id, httpsStatus: 1 })
  return { url: readString(readPath(payload, 'data.pic') || readPath(payload, 'data.albumpic')) }
}
