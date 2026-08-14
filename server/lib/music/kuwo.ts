import { randomBytes } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import iconv from 'iconv-lite'
import { buildUrl, isRecord, mergeCookieHeader, normalizeCollection, parseJsonResponseText, readNumber, readPath, readString, requestBuffer, requestJson, requestText, splitArtists } from './common'
import type { MusicLyrics, MusicResourceUrl, MusicTrack } from './types'
import { getMusicPlatformCookie } from './capability-config'

const LEGACY_SEARCH_API = 'https://search.kuwo.cn/r.s'
const SONG_SEARCH_API = 'https://www.kuwo.cn/search/searchMusicBykeyWord'
const PLAYLIST_API = 'https://nplserver.kuwo.cn/pl.svc'
const MOBILE_API = 'https://m.kuwo.cn/newh5/singles/songinfoandlrc'
const MOBI_PLAY_API = 'https://mobi.kuwo.cn/mobi.s'
const NEW_LYRIC_API = 'http://newlyric.kuwo.cn/newlyric.lrc'
const PLAY_API = 'https://antiserver.kuwo.cn/anti.s'
const PICTURE_API = 'https://artistpicserver.kuwo.cn/pic.web'
const BASE_HEADERS = { 'accept': '*/*', 'user-agent': 'Mozilla/5.0 Chrome/124 Safari/537.36' }
const NEW_LYRIC_KEY = Buffer.from('yeelion')
const NEW_LYRIC_LINE_RE = /^\[(\d{2}):(\d{2})\.(\d{3})\](.*)$/
const NEW_LYRIC_TAG_RE = /^\[[A-Za-z]+:[^\]]*\]$/
const NEW_LYRIC_WORD_RE = /<(-?\d+),(-?\d+)>([^<]*)/g
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
  if (value.bitSwitch !== undefined && readNumber(value.bitSwitch) === 0) return null
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

async function requestLegacyKuwoUrl(url: string, signal?: AbortSignal): Promise<unknown> {
  const text = await requestText(url, { headers: await createHeaders(), signal })
  return parseKuwoResponseText(text)
}

async function requestLegacyKuwo(params: Record<string, string | number>, signal?: AbortSignal): Promise<unknown> {
  return requestLegacyKuwoUrl(buildUrl(LEGACY_SEARCH_API, params), signal)
}

function buildOrderedUrl(baseUrl: string, entries: Array<[string, string | number]>): string {
  const query = new URLSearchParams(entries.map(([key, value]) => [key, String(value)])).toString()
  return `${baseUrl}?${query}`
}

function readKuwoQualityBitrate(quality: string, fallback: number): number {
  const parsed = Number.parseInt(quality, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeKuwoCollection(payload: unknown, path: string): MusicTrack[] {
  if (!isRecord(payload)) throw new Error('酷我音乐上游返回了无效数据')
  if (!Array.isArray(readPath(payload, path))) throw new Error('酷我音乐上游未返回歌曲列表')
  return normalizeCollection(payload, path, normalizeKuwo)
}

export async function searchKuwo(keyword: string, page: number, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const payload = await requestLegacyKuwoUrl(buildUrl(SONG_SEARCH_API, {
    vipver: 1,
    client: 'kt',
    ft: 'music',
    cluster: 0,
    strategy: 2012,
    encoding: 'utf8',
    rformat: 'json',
    mobi: 1,
    issubtitle: 1,
    show_copyright_off: 1,
    pn: page - 1,
    rn: limit,
    all: keyword
  }), signal)
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
    // Kuwo's legacy album endpoint is sensitive to the first parameters being
    // pn, rn, stype and albumid in that order.
    const payload = await requestLegacyKuwoUrl(buildOrderedUrl(LEGACY_SEARCH_API, [
      ['pn', 0],
      ['rn', 200],
      ['stype', 'albuminfo'],
      ['albumid', id],
      ['sortby', 0],
      ['alflac', 1],
      ['show_copyright_off', 1],
      ['pcmp4', 1],
      ['encoding', 'utf8']
    ]), signal)
    return normalizeKuwoCollection(payload, 'musiclist')
  }

  const payload = await requestJson(buildUrl(PLAYLIST_API, {
    op: 'getlistinfo',
    pid: id,
    pn: 0,
    rn: 200,
    encode: 'utf8',
    keyset: 'pl2012',
    identity: 'kuwo',
    pcmp4: 1,
    vipver: 1,
    newver: 1
  }), { headers: await createHeaders(), signal })
  if (!isRecord(payload)) throw new Error('酷我音乐歌单上游返回了无效数据')
  return normalizeKuwoCollection(payload, 'musiclist')
}

export async function getKuwoArtist(rawId: string, limit: number, signal?: AbortSignal): Promise<MusicTrack[]> {
  const id = normalizeKuwoId(rawId)
  if (!id) return []
  const payload = await requestLegacyKuwo({
    stype: 'artist2music',
    artistid: id,
    pn: 0,
    rn: limit,
    show_copyright_off: 1,
    pcmp4: 1,
    vipver: 1,
    rformat: 'json',
    encoding: 'utf8'
  }, signal)
  return normalizeKuwoCollection(payload, 'musiclist').slice(0, limit)
}

export async function getKuwoUrl(rawId: string, bitrate: number, signal?: AbortSignal): Promise<MusicResourceUrl> {
  const id = normalizeKuwoId(rawId)
  if (!id) return { url: '', br: -1 }
  const qualities = bitrate >= 2000
    ? ['2000kflac', 'flac', '320kmp3', '128kmp3']
    : bitrate > 320
      ? ['flac', '320kmp3', '128kmp3']
      : bitrate >= 320
        ? ['320kmp3', '128kmp3']
        : ['128kmp3']
  const user = `C_APK_guanwang_${Date.now()}${randomBytes(4).toString('hex')}`

  for (const quality of qualities) {
    try {
      const payload = await requestJson(buildUrl(MOBI_PLAY_API, {
        f: 'web',
        source: 'kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk',
        from: 'PC',
        type: 'convert_url_with_sign',
        br: quality,
        rid: id,
        user
      }), { headers: await createHeaders(), signal })
      const url = readString(readPath(payload, 'data.url')).trim().replace(/^http:/, 'https:')
      if (!url) continue
      return {
        url,
        br: readNumber(readPath(payload, 'data.bitrate'), readKuwoQualityBitrate(quality, bitrate))
      }
    } catch (error) {
      if (signal?.aborted) throw error
    }
  }

  try {
    const payload = await requestJson(buildUrl(PLAY_API, {
      type: 'convert_url3',
      rid: `MUSIC_${id}`,
      format: 'mp3',
      br: `${Math.min(bitrate, 320)}kmp3`,
      response: 'url'
    }), { headers: await createHeaders(), signal })
    const url = readString(readPath(payload, 'url')).trim().replace(/^http:/, 'https:')
    if (readNumber(readPath(payload, 'code'), -1) === 200 && url) return { url, br: Math.min(bitrate, 320) }
  } catch (error) {
    if (signal?.aborted) throw error
  }

  return { url: '', br: -1 }
}

function xorKuwoNewLyric(value: Buffer): Buffer {
  const output = Buffer.allocUnsafe(value.length)
  for (let index = 0; index < value.length; index += 1) {
    output[index] = value[index]! ^ NEW_LYRIC_KEY[index % NEW_LYRIC_KEY.length]!
  }
  return output
}

function buildKuwoNewLyricParams(id: string): string {
  const params = `user=12345,web,web,web&requester=localhost&req=1&rid=MUSIC_${id}&lrcx=1`
  return xorKuwoNewLyric(Buffer.from(params)).toString('base64')
}

function decodeKuwoNewLyric(value: Buffer): string {
  if (value.subarray(0, 10).toString('ascii') !== 'tp=content') throw new Error('酷我音乐新版歌词响应无效')
  const payloadIndex = value.indexOf('\r\n\r\n')
  if (payloadIndex < 0) throw new Error('酷我音乐新版歌词负载无效')

  const inflated = inflateSync(value.subarray(payloadIndex + 4))
  const encoded = inflated.toString('ascii').replace(/[\s]/g, '')
  if (!encoded) throw new Error('酷我音乐新版歌词内容为空')
  const decoded = Buffer.from(encoded, 'base64')
  if (decoded.length === 0) throw new Error('酷我音乐新版歌词编码无效')
  return iconv.decode(xorKuwoNewLyric(decoded), 'gb18030')
}

function kuwoNewLyricPayloadText(payload: string): string {
  const matches = [...payload.matchAll(NEW_LYRIC_WORD_RE)]
  if (matches.length === 0) return payload.trim()
  return matches.map(match => match[3] || '').join('').trim()
}

function isKuwoChineseTranslationPayload(payload: string): boolean {
  if (!payload.startsWith('<0,0>')) return false
  const text = kuwoNewLyricPayloadText(payload)
  return /[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u30FF\uFF66-\uFF9F]/.test(text)
}

function isKuwoRomajiPayload(value: string): boolean {
  return /[A-Za-z]/.test(value) && !/[\u4E00-\u9FFF\u3040-\u30FF\uFF66-\uFF9F]/.test(value)
}

function convertKuwoNewLyric(raw: string): string {
  const lines = raw.split(/[\r\n]+/)
  const output: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim()
    if (!line) continue
    const matches = NEW_LYRIC_LINE_RE.exec(line)
    if (!matches) {
      if (NEW_LYRIC_TAG_RE.test(line)) output.push(line)
      continue
    }

    const payload = matches[4] || ''
    if (isKuwoChineseTranslationPayload(payload)) continue
    const lyric = kuwoNewLyricPayloadText(payload)
    if (!lyric) continue

    const timestamp = `[${matches[1]}:${matches[2]}.${matches[3]}]`
    output.push(`${timestamp}${lyric}`)

    let romaji = ''
    let translation = ''
    while (index + 1 < lines.length) {
      const nextMatches = NEW_LYRIC_LINE_RE.exec(lines[index + 1]!.trim())
      const nextPayload = nextMatches?.[4] || ''
      if (!nextMatches || !nextPayload.startsWith('<0,0>')) break
      index += 1
      const nextText = kuwoNewLyricPayloadText(nextPayload)
      if (!nextText) continue
      if (!translation && isKuwoChineseTranslationPayload(nextPayload)) translation = nextText
      else if (!romaji && isKuwoRomajiPayload(nextText)) romaji = nextText
    }
    if (romaji) output.push(`${timestamp}${romaji}`)
    if (translation) output.push(`${timestamp}${translation}`)
  }

  return output.join('\n')
}

function formatKuwoLegacyLyrics(lines: unknown[]): string {
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
  return lyric ? `${lyric}\n` : ''
}

export async function getKuwoLyrics(rawId: string, signal?: AbortSignal): Promise<MusicLyrics> {
  const id = normalizeKuwoId(rawId)
  if (!id) return { lyric: '', tlyric: '' }

  try {
    const url = `${NEW_LYRIC_API}?${encodeURIComponent(buildKuwoNewLyricParams(id))}`
    const buffer = await requestBuffer(url, { headers: { ...BASE_HEADERS, referer: 'https://www.kuwo.cn/' }, signal })
    const lyric = convertKuwoNewLyric(decodeKuwoNewLyric(buffer))
    if (lyric.split(/\r?\n/).some(line => NEW_LYRIC_LINE_RE.test(line.trim()))) return { lyric, tlyric: '' }
  } catch (error) {
    if (signal?.aborted) throw error
  }

  const payload = await requestJson(buildUrl(MOBILE_API, { musicId: id, httpsStatus: 1 }), {
    headers: await createHeaders('https://m.kuwo.cn/'),
    signal
  })
  if (!isRecord(payload) || readNumber(payload.status, -1) !== 200) return { lyric: '', tlyric: '' }
  const lines = readPath(payload, 'data.lrclist')
  return { lyric: Array.isArray(lines) ? formatKuwoLegacyLyrics(lines) : '', tlyric: '' }
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
