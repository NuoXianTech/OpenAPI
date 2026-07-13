import { createCipheriv, randomBytes } from 'node:crypto'
import { buildUrl, isRecord, normalizeCollection, readNumber, readPath, readString, requestJson, splitArtists } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack } from './types'

const API_URL = 'https://musicapi.taihe.com/v1/restserver/ting'
const HEADERS = { 'cookie': `BAIDUID=${randomBytes(16).toString('hex')}:FG=1`, 'user-agent': 'Mozilla/5.0 baidu-music/1.2.1', 'accept': '*/*' }

function normalizeBaidu(value: unknown): MusicTrack | null {
  if (!isRecord(value)) return null
  const id = readString(value.song_id || value.songid)
  const name = readString(value.title)
  if (!id || !name) return null
  return { id, name, artist: splitArtists(value.author, /,|，/), album: readString(value.album_title), pic_id: id, url_id: id, lyric_id: id, source: 'baidu' }
}

function get(params: Record<string, string | number>): Promise<unknown> {
  return requestJson(buildUrl(API_URL, params), { headers: HEADERS })
}

function encryptedSongParams(id: string): Record<string, string | number> {
  const cipher = createCipheriv('aes-128-cbc', 'DBEECF8C50FD160E', '1231021386755796')
  cipher.setAutoPadding(true)
  const encrypted = `${cipher.update(`songid=${id}&ts=${Date.now()}`, 'utf8', 'base64')}${cipher.final('base64')}`
  return { from: 'qianqianmini', method: 'baidu.ting.song.getInfos', songid: id, res: 1, platform: 'darwin', version: '1.0.0', e: encrypted }
}

export function searchBaidu(keyword: string, page: number, limit: number): Promise<MusicTrack[]> {
  return get({ from: 'qianqianmini', method: 'baidu.ting.search.merge', isNew: 1, platform: 'darwin', page_no: page, query: keyword, version: '11.2.1', page_size: limit }).then(data => normalizeCollection(data, 'result.song_info.song_list', normalizeBaidu))
}

export async function getBaiduTracks(operation: 'song' | 'album' | 'playlist', id: string): Promise<MusicTrack[]> {
  const requests = {
    song: [encryptedSongParams(id), 'songinfo'],
    album: [{ from: 'qianqianmini', method: 'baidu.ting.album.getAlbumInfo', album_id: id, platform: 'darwin', version: '11.2.1' }, 'songlist'],
    playlist: [{ from: 'qianqianmini', method: 'baidu.ting.diy.gedanInfo', listid: id, platform: 'darwin', version: '11.2.1' }, 'content']
  } satisfies Record<string, [Record<string, string | number>, string]>
  const [params, path] = requests[operation]
  return normalizeCollection(await get(params), path, normalizeBaidu)
}

export function getBaiduArtist(id: string, limit: number): Promise<MusicTrack[]> {
  return get({ from: 'qianqianmini', method: 'baidu.ting.artist.getSongList', artistid: id, limits: limit, offset: 0, tinguid: 0, platform: 'darwin', version: '11.2.1' }).then(data => normalizeCollection(data, 'songlist', normalizeBaidu))
}

export async function getBaiduUrl(id: string, bitrate: number): Promise<MusicResourceUrl> {
  const payload = await get(encryptedSongParams(id))
  const urls = readPath(payload, 'songurl.url')
  if (!Array.isArray(urls)) return { url: '', br: -1 }
  let result: MusicResourceUrl = { url: '', br: -1 }
  for (const item of urls) {
    if (!isRecord(item)) continue
    const candidateBitrate = readNumber(item.file_bitrate)
    if (candidateBitrate <= bitrate && candidateBitrate > (result.br || -1)) result = { url: readString(item.file_link), br: candidateBitrate }
  }
  return result
}

export async function getBaiduLyrics(id: string): Promise<MusicLyrics> {
  const payload = await get({ from: 'qianqianmini', method: 'baidu.ting.song.lry', songid: id, platform: 'darwin', version: '1.0.0' })
  return { lyric: readString(isRecord(payload) ? payload.lrcContent : ''), tlyric: '' }
}

export async function getBaiduPicture(id: string): Promise<MusicResourceUrl> {
  const payload = await get(encryptedSongParams(id))
  return { url: readString(readPath(payload, 'songinfo.pic_radio') || readPath(payload, 'songinfo.pic_small')) }
}
