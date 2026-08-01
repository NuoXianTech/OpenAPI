import { buildUrl, isRecord, mergeCookieHeader, normalizeCollection, parseJsonResponseText, readNumber, readPath, readString, requestJson, requestText, splitArtists } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack } from './types'
import { getMusicPlatformCookie } from './capability-config'

const SEARCH_API = 'https://search.kuwo.cn/r.s'
const PLAYLIST_API = 'https://nplserver.kuwo.cn/pl.svc'
const MOBILE_API = 'https://m.kuwo.cn/newh5/singles/songinfoandlrc'
const LYRIC_API = 'https://www.kuwo.cn/openapi/v1/www/lyric/getlyric'
const PLAY_API = 'https://antiserver.kuwo.cn/anti.s'
const PICTURE_API = 'https://artistpicserver.kuwo.cn/pic.web'
const BASE_HEADERS = { 'accept': '*/*', 'user-agent': 'Mozilla/5.0 Chrome/124 Safari/537.36' }
const PYTHON_LITERAL_REPLACEMENTS = [['None', 'null'], ['True', 'true'], ['False', 'false']] as const
const SINGLE_QUOTE_ESCAPES: Record<string, string> = { 'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t', '\\': '\\', '\'': '\'', '"': '"', '/': '/' }

async function createHeaders(referer = 'https://www.kuwo.cn/'): Promise<Record<string, string>> {
  const cookie = mergeCookieHeader('', await getMusicPlatformCookie('kuwo'))
  return cookie ? { ...BASE_HEADERS, referer, cookie } : { ...BASE_HEADERS, referer }
}

function decodeKuwoText(value: unknown): string {
  return readString(value)
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', '\'')
    .trim()
}

function normalizeKuwoId(value: string): string {
  const id = value.trim().replace(/^MUSIC_/i, '')
  return /^\d+$/.test(id) ? id : ''
}

function normalizeKuwo(value: unknown): MusicTrack | null {
  if (!isRecord(value)) return null
  const id = normalizeKuwoId(readString(value.MUSICRID || value.musicrId || value.musicrid || value.rid || value.id))
  const name = decodeKuwoText(value.SONGNAME || value.NAME || value.songName || value.name)
  if (!id || !name) return null
  const artist = decodeKuwoText(value.ARTIST || value.artist)
  return {
    id,
    name,
    artists: splitArtists(artist, /&|\/|、/),
    album: decodeKuwoText(value.ALBUM || value.album),
    pictureId: id,
    audioId: id,
    lyricsId: id,
    platform: 'kuwo'
  }
}

function convertSingleQuotedJson(value: string): string {
  let output = ''
  let index = 0

  while (index < value.length) {
    const character = value[index]!
    if (character === '"') {
      const start = index++
      while (index < value.length) {
        if (value[index] === '\\') index += 2
        else if (value[index++] === '"') break
      }
      output += value.slice(start, index)
      continue
    }

    if (character !== '\'') {
      const replacement = PYTHON_LITERAL_REPLACEMENTS.find(([candidate]) => {
        if (!value.startsWith(candidate, index)) return false
        const before = value[index - 1] || ''
        const after = value[index + candidate.length] || ''
        return !/[\w$]/.test(before) && !/[\w$]/.test(after)
      })
      if (replacement) {
        output += replacement[1]
        index += replacement[0].length
      } else {
        output += character
        index += 1
      }
      continue
    }

    index += 1
    let decoded = ''
    let closed = false
    while (index < value.length) {
      const current = value[index++]!
      if (current === '\'') {
        closed = true
        break
      }
      if (current !== '\\') {
        decoded += current
        continue
      }

      const escaped = value[index++] || ''
      if (escaped === 'u' && /^[\da-f]{4}$/i.test(value.slice(index, index + 4))) {
        decoded += String.fromCharCode(Number.parseInt(value.slice(index, index + 4), 16))
        index += 4
      } else if (escaped === 'x' && /^[\da-f]{2}$/i.test(value.slice(index, index + 2))) {
        decoded += String.fromCharCode(Number.parseInt(value.slice(index, index + 2), 16))
        index += 2
      } else {
        decoded += SINGLE_QUOTE_ESCAPES[escaped] ?? escaped
      }
    }
    if (!closed) throw new Error('酷我音乐上游返回了无效 JSON 数据')
    output += JSON.stringify(decoded)
  }

  return output
}

function parseKuwoResponseText(text: string): unknown {
  try { return parseJsonResponseText(text) } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) throw new Error('酷我音乐上游返回了无效数据')
    try {
      return JSON.parse(convertSingleQuotedJson(text.slice(start, end + 1))) as unknown
    } catch {
      throw new Error('酷我音乐上游返回了无效 JSON 数据')
    }
  }
}

async function requestLegacyKuwo(params: Record<string, string | number>, signal?: AbortSignal): Promise<unknown> {
  const text = await requestText(buildUrl(SEARCH_API, params), { headers: await createHeaders(), signal })
  return parseKuwoResponseText(text)
}

function normalizeKuwoCollection(payload: unknown, path: string): MusicTrack[] {
  if (!isRecord(payload)) throw new Error('酷我音乐上游返回了无效数据')
  if (!Array.isArray(readPath(payload, path))) throw new Error('酷我音乐上游未返回歌曲列表')
  return normalizeCollection(payload, path, normalizeKuwo)
}

export async function searchKuwo(keyword: string, page: number, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const payload = await requestLegacyKuwo({
    all: keyword,
    ft: 'music',
    itemset: 'web_2013',
    client: 'kt',
    pn: page - 1,
    rn: limit,
    rformat: 'json',
    encoding: 'utf8'
  }, signal)
  return normalizeKuwoCollection(payload, 'abslist')
}

export async function getKuwoTracks(operation: 'song' | 'album' | 'playlist', rawId: string, signal?: AbortSignal): Promise<MusicTrack[]> {
  const id = normalizeKuwoId(rawId)
  if (!id) return []

  if (operation === 'song') {
    const payload = await requestJson(buildUrl(MOBILE_API, { musicId: id, httpsStatus: 1 }), {
      headers: await createHeaders('https://m.kuwo.cn/'),
      signal
    })
    if (!isRecord(payload)) throw new Error('酷我音乐单曲上游返回了无效数据')
    if (readNumber(payload.status, -1) !== 200) return []
    return normalizeCollection(payload, 'data.songinfo', normalizeKuwo)
  }

  if (operation === 'album') {
    const payload = await requestLegacyKuwo({ stype: 'albuminfo', albumid: id, pn: 0, rn: 200, rformat: 'json', encoding: 'utf8' }, signal)
    return normalizeKuwoCollection(payload, 'musiclist')
  }

  const payload = await requestJson(buildUrl(PLAYLIST_API, {
    op: 'getlistinfo',
    pid: id,
    pn: 1,
    rn: 200,
    encode: 'utf8',
    keyset: 'pl2012',
    vipver: 'MUSIC_9.1.1.2_W1',
    newver: 1
  }), { headers: await createHeaders(), signal })
  if (!isRecord(payload)) throw new Error('酷我音乐歌单上游返回了无效数据')
  if (readString(payload.result) !== 'ok') {
    throw new Error(`酷我音乐歌单上游返回业务错误${readString(payload.msg) ? `（${readString(payload.msg)}）` : ''}`)
  }
  return normalizeKuwoCollection(payload, 'musiclist')
}

export async function getKuwoArtist(rawId: string, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const id = normalizeKuwoId(rawId)
  if (!id) return []
  const payload = await requestLegacyKuwo({ stype: 'artist2music', artistid: id, pn: 0, rn: limit, rformat: 'json', encoding: 'utf8' }, signal)
  return normalizeKuwoCollection(payload, 'musiclist').slice(0, limit)
}

export async function getKuwoUrl(rawId: string, bitrate: number, signal?: AbortSignal): Promise<MusicResourceUrl> {
  const id = normalizeKuwoId(rawId)
  if (!id) return { url: '', br: -1 }
  const payload = await requestJson(buildUrl(PLAY_API, { type: 'convert_url3', rid: `MUSIC_${id}`, format: 'mp3', br: `${bitrate}kmp3`, response: 'url' }), {
    headers: await createHeaders(),
    signal
  })
  const url = readString(readPath(payload, 'url'))
  return readNumber(readPath(payload, 'code'), -1) === 200 && url ? { url, br: bitrate } : { url: '', br: -1 }
}

export async function getKuwoLyrics(rawId: string, signal?: AbortSignal): Promise<MusicLyrics> {
  const id = normalizeKuwoId(rawId)
  if (!id) return { lyric: '', tlyric: '' }
  const payload = await requestJson(buildUrl(LYRIC_API, { musicId: id }), { headers: await createHeaders(), signal })
  if (readNumber(readPath(payload, 'code'), -1) !== 200) return { lyric: '', tlyric: '' }
  const lines = readPath(payload, 'data.lrclist')
  if (!Array.isArray(lines)) throw new Error('酷我音乐歌词上游未返回歌词列表')
  const lyric = lines.map((item) => {
    if (!isRecord(item)) return ''
    const line = readString(item.lineLyric)
    const time = Number(item.time)
    if (!line || !Number.isFinite(time) || time < 0) return ''
    const totalCentiseconds = Math.round(time * 100)
    const minutes = Math.floor(totalCentiseconds / 6000).toString().padStart(2, '0')
    const seconds = Math.floor(totalCentiseconds % 6000 / 100).toString().padStart(2, '0')
    const centiseconds = (totalCentiseconds % 100).toString().padStart(2, '0')
    return `[${minutes}:${seconds}.${centiseconds}]${line}`
  }).filter(Boolean).join('\n')
  return { lyric: lyric ? `${lyric}\n` : '', tlyric: '' }
}

export async function getKuwoPicture(rawId: string, signal?: AbortSignal): Promise<MusicResourceUrl> {
  const id = normalizeKuwoId(rawId)
  if (!id) return { url: '' }
  const value = (await requestText(buildUrl(PICTURE_API, { corp: 'kuwo', type: 'rid_pic', pictype: 'url', size: 500, rid: id }), {
    headers: await createHeaders(),
    signal
  })).trim().replace(/^http:/, 'https:')
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? { url: url.toString() } : { url: '' }
  } catch {
    return { url: '' }
  }
}
