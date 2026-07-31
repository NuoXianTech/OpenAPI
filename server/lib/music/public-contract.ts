import type { MusicLyrics, MusicOperation, MusicPlatform, MusicTrack, PublicMusicTrack } from './types'

const LRC_LINE_RE = /^\[(\d{1,3}):(\d{2}(?:\.\d+)?)\](.*)$/

function buildMusicResourceLink(
  requestUrl: URL,
  platform: MusicPlatform,
  type: Extract<MusicOperation, 'url' | 'lrc' | 'pic'>,
  id: string | number
): string {
  const url = new URL('/v1/music', requestUrl)
  url.searchParams.set('server', platform)
  url.searchParams.set('type', type)
  url.searchParams.set('id', String(id))
  return url.toString()
}

export function toPublicMusicTracks(tracks: MusicTrack[], requestUrl: URL): PublicMusicTrack[] {
  return tracks.map(track => ({
    title: track.name,
    artist: track.artists.join(' / '),
    album: track.album,
    url: buildMusicResourceLink(requestUrl, track.platform, 'url', track.audioId),
    pic: buildMusicResourceLink(requestUrl, track.platform, 'pic', track.pictureId),
    lrc: buildMusicResourceLink(requestUrl, track.platform, 'lrc', track.lyricsId)
  }))
}

export function normalizeMusicRedirectUrl(platform: MusicPlatform, value: string): string | null {
  let normalized = value.trim()
  if (!normalized) return null

  if (platform === 'netease') {
    normalized = normalized
      .replace('://m7c.', '://m7.')
      .replace('://m8c.', '://m8.')
      .replace('http://', 'https://')
  } else if (platform === 'tencent') {
    normalized = normalized
      .replace('http://', 'https://')
      .replace('://ws.stream.qqmusic.qq.com', '://dl.stream.qqmusic.qq.com')
  } else if (platform === 'baidu') {
    normalized = normalized.replace(
      'http://zhangmenshiting.qianqian.com',
      'https://gss3.baidu.com/y0s1hSulBw92lNKgpU_Z2jR7b2w6buu'
    )
  }

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (platform === 'netease' && url.searchParams.has('vuutv')) url.search = ''
    return url.toString()
  } catch {
    return null
  }
}

function readLrcTimestamp(line: string): { key: number, text: string } | null {
  const match = LRC_LINE_RE.exec(line)
  if (!match) return null
  const minute = Number.parseInt(match[1]!, 10)
  const second = Number.parseFloat(match[2]!)
  return {
    key: Math.round((minute * 60 + second) * 1000),
    text: match[3] || ''
  }
}

export function formatMusicLyrics({ lyric, tlyric }: MusicLyrics): string {
  if (!tlyric.trim()) return lyric

  const translations = new Map<number, string>()
  for (const line of tlyric.split(/\r?\n/)) {
    const parsed = readLrcTimestamp(line)
    if (parsed?.text.trim()) translations.set(parsed.key, parsed.text.trim())
  }
  if (translations.size === 0) return lyric

  return lyric.split(/\r?\n/).map((line) => {
    const parsed = readLrcTimestamp(line)
    const translation = parsed ? translations.get(parsed.key) : undefined
    return translation ? `${line} (${translation})` : line
  }).join('\n')
}
