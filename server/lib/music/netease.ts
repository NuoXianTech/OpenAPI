import { createCipheriv, createHash, randomBytes } from 'node:crypto'
import { isRecord, mergeCookieHeader, normalizeCollection, readNumber, readPath, readString, requestJson } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack, NeteaseAlbum, NeteaseArtist, NeteaseTrack } from './types'
import { getMusicPlatformCookie } from './capability-config'

const EAPI_KEY = Buffer.from('e82ckenh8dichen8', 'utf8')
const BASE_URL = 'https://music.163.com'

interface NeteaseRequestOptions { path: string, body: Record<string, unknown> }

function encryptEapi(path: string, body: Record<string, unknown>): string {
  const text = JSON.stringify(body)
  const digest = createHash('md5').update(`nobody${path}use${text}md5forencrypt`).digest('hex')
  const payload = `${path}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  const cipher = createCipheriv('aes-128-ecb', EAPI_KEY, null)
  cipher.setAutoPadding(true)
  return `${cipher.update(payload, 'utf8', 'hex')}${cipher.final('hex')}`.toUpperCase()
}

function createHeaders(configuredCookie: string): Record<string, string> {
  const timestamp = Date.now()
  const defaultCookie = `os=android; appver=8.7.01; deviceId=${randomBytes(16).toString('hex').toUpperCase()}; requestId=${timestamp}_${Math.floor(Math.random() * 10_000).toString().padStart(4, '0')}`
  return {
    'accept': '*/*',
    'content-type': 'application/x-www-form-urlencoded',
    'cookie': mergeCookieHeader(defaultCookie, configuredCookie),
    'referer': BASE_URL,
    'user-agent': 'NeteaseMusic/8.7.01 (Linux; Android 11)'
  }
}

async function requestNetease(options: NeteaseRequestOptions, signal?: AbortSignal): Promise<unknown> {
  const cookie = await getMusicPlatformCookie('netease')
  const payload = await requestJson(`${BASE_URL}${options.path.replace('/api/', '/eapi/')}`, {
    method: 'POST',
    headers: createHeaders(cookie),
    body: new URLSearchParams({ params: encryptEapi(options.path, options.body) }),
    signal
  })
  if (!isRecord(payload)) throw new Error('网易云音乐上游返回了无效数据')
  const code = readNumber(payload.code, -1)
  if (code !== 200) {
    const message = readString(payload.message || payload.msg).trim()
    throw new Error(`网易云音乐上游返回业务错误（code=${code}${message ? `, ${message}` : ''}）`)
  }
  return payload
}

function normalizeTrack(value: unknown): MusicTrack | null {
  if (!isRecord(value)) return null
  const track = value as NeteaseTrack
  const album = isRecord(track.al) ? track.al as NeteaseAlbum : {}
  const artists = Array.isArray(track.ar) ? track.ar : []
  const id = typeof track.id === 'string' || typeof track.id === 'number' ? track.id : null
  if (id === null || typeof track.name !== 'string') return null
  const pictureMatch = typeof album.picUrl === 'string' ? album.picUrl.match(/\/(\d+)\./) : null
  const pictureId = pictureMatch?.[1] || (typeof album.pic_str === 'string' || typeof album.pic_str === 'number' ? album.pic_str : album.pic)
  return {
    id,
    name: track.name,
    artists: artists.map(item => isRecord(item) ? (item as NeteaseArtist).name : '').filter((name): name is string => typeof name === 'string'),
    album: typeof album.name === 'string' ? album.name : '',
    pictureId: typeof pictureId === 'string' || typeof pictureId === 'number' ? pictureId : '',
    audioId: id,
    lyricsId: id,
    platform: 'netease'
  }
}

function normalizeTracks(payload: unknown, path: string): MusicTrack[] {
  return normalizeCollection(payload, path, normalizeTrack)
}

export async function searchNetease(keyword: string, page: number, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const payload = await requestNetease({ path: '/api/cloudsearch/pc', body: { s: keyword, type: 1, limit, total: 'true', offset: (page - 1) * limit } }, signal)
  return normalizeTracks(payload, 'result.songs')
}

export async function getNeteaseTracks(operation: 'song' | 'album' | 'playlist', id: string, signal?: AbortSignal): Promise<MusicTrack[]> {
  const requests: Record<typeof operation, NeteaseRequestOptions & { resultPath: string }> = {
    song: { path: '/api/v3/song/detail/', body: { c: JSON.stringify([{ id, v: 0 }]) }, resultPath: 'songs' },
    album: { path: `/api/v1/album/${encodeURIComponent(id)}`, body: { id, limit: '200', total: 'true' }, resultPath: 'songs' },
    playlist: { path: '/api/v6/playlist/detail', body: { id, n: '200', s: '0', t: '0' }, resultPath: 'playlist.tracks' }
  }
  const request = requests[operation]
  return normalizeTracks(await requestNetease(request, signal), request.resultPath)
}

export async function getNeteaseArtistTracks(id: string, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const payload = await requestNetease({ path: `/api/v1/artist/${encodeURIComponent(id)}`, body: { id, top: limit, ext: 'true' } }, signal)
  return normalizeTracks(payload, 'hotSongs').slice(0, limit)
}

export async function getNeteaseUrl(id: string, bitrate: number, signal?: AbortSignal): Promise<MusicResourceUrl> {
  const payload = await requestNetease({ path: '/api/song/enhance/player/url', body: { ids: [id], br: bitrate * 1000 } }, signal)
  const first = readPath(payload, 'data.0')
  if (!isRecord(first)) return { url: '', size: 0, br: -1 }
  const fallback = isRecord(first.uf) ? first.uf.url : undefined
  const url = typeof first.url === 'string' ? first.url : typeof fallback === 'string' ? fallback : ''
  return { url, size: typeof first.size === 'number' ? first.size : 0, br: typeof first.br === 'number' ? first.br / 1000 : -1 }
}

export async function getNeteaseLyrics(id: string, signal?: AbortSignal): Promise<MusicLyrics> {
  const payload = await requestNetease({ path: '/api/song/lyric', body: { id, os: 'linux', lv: -1, kv: -1, tv: -1 } }, signal)
  const lyric = readPath(payload, 'lrc.lyric')
  const translatedLyric = readPath(payload, 'tlyric.lyric')
  return { lyric: typeof lyric === 'string' ? lyric : '', tlyric: typeof translatedLyric === 'string' ? translatedLyric : '' }
}

export function getNeteasePicture(id: string, size: number): MusicResourceUrl {
  const magic = '3go8&$8*3*3h0k(2)2'
  const encrypted = Array.from(id, (character, index) => String.fromCharCode(character.charCodeAt(0) ^ magic.charCodeAt(index % magic.length))).join('')
  const hash = createHash('md5').update(encrypted, 'binary').digest('base64').replaceAll('/', '_').replaceAll('+', '-')
  return { url: `https://p3.music.126.net/${hash}/${encodeURIComponent(id)}.jpg?param=${size}y${size}` }
}
