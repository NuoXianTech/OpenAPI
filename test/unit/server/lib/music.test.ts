import { afterEach, describe, expect, it, vi } from 'vitest'
import { mergeCookieHeader, parseJsonResponseText, requestJson } from '~~/server/lib/music/common'
import { getNeteasePicture, getNeteaseUrl } from '~~/server/lib/music/netease'
import { getTencentPicture, searchTencent } from '~~/server/lib/music/tencent'
import { isMusicPlatform, searchMusic } from '~~/server/lib/music/client'
import { getKugouUrl, searchKugou } from '~~/server/lib/music/kugou'
import { getKuwoUrl, searchKuwo } from '~~/server/lib/music/kuwo'
import { formatMusicLyrics, normalizeMusicRedirectUrl, toPublicMusicTracks } from '~~/server/lib/music/public-contract'
import { parseMusicRequestQuery } from '~~/server/lib/music/request'
import { MUSIC_PLATFORMS } from '~~/server/lib/music/types'

const musicCapabilityMocks = vi.hoisted(() => ({
  getMusicPlatformCookie: vi.fn().mockResolvedValue('')
}))

const musicSharedCacheMocks = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  getSharedCache: vi.fn(async (options: { key: string, loader: () => Promise<unknown> }) => {
    if (musicSharedCacheMocks.values.has(options.key)) return musicSharedCacheMocks.values.get(options.key)
    const value = await options.loader()
    musicSharedCacheMocks.values.set(options.key, value)
    return value
  })
}))

vi.mock('~~/server/lib/music/capability-config', () => ({
  getMusicPlatformCookie: musicCapabilityMocks.getMusicPlatformCookie,
  getEnabledMusicPlatforms: vi.fn().mockResolvedValue(new Set(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])),
  isMusicPlatformEnabled: vi.fn().mockResolvedValue(true)
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  getSharedCache: musicSharedCacheMocks.getSharedCache
}))

afterEach(() => {
  vi.restoreAllMocks()
  musicCapabilityMocks.getMusicPlatformCookie.mockReset().mockResolvedValue('')
  musicSharedCacheMocks.values.clear()
  musicSharedCacheMocks.getSharedCache.mockClear()
})

describe('music API helpers', () => {
  it('recognizes all supported Meting platforms', () => {
    expect(MUSIC_PLATFORMS).toEqual(['netease', 'tencent', 'kugou', 'baidu', 'kuwo'])
    MUSIC_PLATFORMS.forEach(platform => expect(isMusicPlatform(platform)).toBe(true))
    expect(isMusicPlatform('unknown')).toBe(false)
  })

  it('parses the unified server/type/id request contract', () => {
    expect(parseMusicRequestQuery({ id: '周杰伦' })).toEqual({
      ok: true,
      data: {
        platform: 'netease',
        operation: 'search',
        id: '周杰伦',
        page: 1,
        limit: 30
      }
    })
    expect(parseMusicRequestQuery({ server: 'tencent', type: 'artist', id: '42', limit: '20' })).toEqual({
      ok: true,
      data: {
        platform: 'tencent',
        operation: 'artist',
        id: '42',
        page: 1,
        limit: 20
      }
    })
    expect(parseMusicRequestQuery({ q: '旧参数' })).toMatchObject({ ok: false, code: 'UNSUPPORTED_PARAMETER' })
    expect(parseMusicRequestQuery({ type: '1', id: '旧搜索类型' })).toMatchObject({ ok: false, code: 'INVALID_TYPE' })
  })

  it('hides provider resource IDs behind directly callable links', () => {
    const [track] = toPublicMusicTracks([{
      id: 1,
      name: '晴天',
      artists: ['周杰伦'],
      album: '叶惠美',
      pictureId: 'picture-id',
      audioId: 'audio-id',
      lyricsId: 'lyrics-id',
      platform: 'netease'
    }], new URL('https://api.example.com/v1/music?server=netease&type=search&id=test'))

    expect(track).toEqual({
      title: '晴天',
      artist: '周杰伦',
      album: '叶惠美',
      url: 'https://api.example.com/v1/music?server=netease&type=url&id=audio-id',
      pic: 'https://api.example.com/v1/music?server=netease&type=pic&id=picture-id',
      lrc: 'https://api.example.com/v1/music?server=netease&type=lrc&id=lyrics-id'
    })
    expect(track).not.toHaveProperty('audioId')
    expect(track).not.toHaveProperty('pictureId')
    expect(track).not.toHaveProperty('lyricsId')
  })

  it('merges translated lyrics and normalizes redirect URLs', () => {
    expect(formatMusicLyrics({
      lyric: '[00:01.00]Hello\n[00:02.00]World',
      tlyric: '[00:01.000]你好'
    })).toBe('[00:01.00]Hello (你好)\n[00:02.00]World')
    expect(formatMusicLyrics({ lyric: '', tlyric: '[00:01.00]仅翻译歌词' })).toBe('[00:01.00]仅翻译歌词')
    expect(normalizeMusicRedirectUrl('tencent', 'http://ws.stream.qqmusic.qq.com/test.mp3'))
      .toBe('https://dl.stream.qqmusic.qq.com/test.mp3')
    expect(normalizeMusicRedirectUrl('netease', 'javascript:alert(1)')).toBeNull()
  })

  it('parses JSON, JSONP, BOM and trailing non-JSON content', () => {
    expect(parseJsonResponseText('{"code":0}')).toEqual({ code: 0 })
    expect(parseJsonResponseText('MusicJsonCallback({"code":0});')).toEqual({ code: 0 })
    expect(parseJsonResponseText('\uFEFF  callback({"items":[1,2]}) trailing')).toEqual({ items: [1, 2] })
    expect(() => parseJsonResponseText('upstream unavailable')).toThrow('无效数据')
  })

  it('generates deterministic provider picture URLs', () => {
    expect(getNeteasePicture('109951170048506929', 300).url).toMatch(/^https:\/\/p3\.music\.126\.net\/.+\/109951170048506929\.jpg\?param=300y300$/)
    expect(getTencentPicture('003v4UL61IYlTY', 500).url).toBe('https://y.gtimg.cn/music/photo_new/T002R500x500M000003v4UL61IYlTY.jpg?max_age=2592000')
  })

  it('merges built-in and configured cookies without malformed separators', () => {
    expect(mergeCookieHeader('os=android;', '; MUSIC_U=secret')).toBe('os=android; MUSIC_U=secret')
    expect(mergeCookieHeader('', 'uin=123')).toBe('uin=123')
    expect(mergeCookieHeader('os=android; uin=0', 'uin=123; token=value=with=equals'))
      .toBe('os=android; uin=123; token=value=with=equals')
  })

  it('includes the upstream hostname and network error code in request failures', async () => {
    const cause = Object.assign(new Error('certificate mismatch'), { code: 'CERT_ALTNAME_INVALID' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(Object.assign(new TypeError('fetch failed'), { cause }))

    await expect(requestJson('https://mobilecdn.kugou.com/api/test'))
      .rejects.toThrow('mobilecdn.kugou.com 请求失败（CERT_ALTNAME_INVALID）')
  })

  it('uses the stable Tencent search endpoint and caches successful searches in the client layer', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      code: 0,
      subcode: 0,
      data: {
        song: {
          list: [{
            mid: 'song-mid',
            name: '测试歌曲',
            album: { mid: 'album-mid', title: '测试专辑' },
            singer: [{ name: '测试歌手' }]
          }]
        }
      }
    })))

    const controller = new AbortController()
    const options = { keyword: 'unit-test-tencent-search-success', platform: 'tencent' as const, page: 1, limit: 3 }
    const first = await searchMusic(options, controller.signal)
    const second = await searchMusic(options, controller.signal)

    expect(first).toEqual([{
      id: 'song-mid',
      name: '测试歌曲',
      artists: ['测试歌手'],
      album: '测试专辑',
      pictureId: 'album-mid',
      audioId: 'song-mid',
      lyricsId: 'song-mid',
      platform: 'tencent'
    }])
    expect(second).toEqual(first)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/soso/fcgi-bin/client_search_cp?')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('w=unit-test-tencent-search-success')
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it('does not disguise Tencent search business errors as empty results', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      code: 2001,
      subcode: 0,
      message: 'request filtered'
    })))

    await expect(searchTencent('unit-test-tencent-search-error', 1, 3))
      .rejects.toThrow('code=2001')
  })

  it('reads the first Netease playback item through an array path', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      code: 200,
      data: [{ url: 'https://example.com/netease.mp3', size: 4096, br: 320000 }]
    })))

    await expect(getNeteaseUrl('123', 320)).resolves.toEqual({
      url: 'https://example.com/netease.mp3',
      size: 4096,
      br: 320
    })
  })

  it('uses the valid Kugou mobile service host without forwarding configured cookies', async () => {
    musicCapabilityMocks.getMusicPlatformCookie.mockResolvedValue('tracking=must-not-leak')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      status: 1,
      errcode: 0,
      data: {
        info: [{ hash: 'song-hash', filename: '测试歌手 - 测试歌曲', album_name: '测试专辑' }]
      }
    })))

    await expect(searchKugou('测试', 1, 1)).resolves.toHaveLength(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('https://mobileservice.kugou.com/api/v3/search/song?')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('cookie')
  })

  it('never sends configured cookies to the plaintext Kugou privilege endpoint', async () => {
    musicCapabilityMocks.getMusicPlatformCookie.mockResolvedValueOnce('tracking=must-not-leak')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      status: 1,
      error_code: 0,
      data: [{ relate_goods: [] }]
    })))

    await expect(getKugouUrl('song-hash', 320)).resolves.toEqual({ url: '', size: 0, br: -1 })
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://media.store.kugou.com/v1/get_res_privilege')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty('cookie')
  })

  it('parses Kuwo single-quoted search responses without executing upstream code', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      '{\'abslist\':[{\'MUSICRID\':\'MUSIC_228908\',\'SONGNAME\':\'晴天&nbsp;(Live)\',\'ARTIST\':\'周杰伦&林俊杰\',\'ALBUM\':\'叶惠美\'}]}'
    ))

    await expect(searchKuwo('晴天', 2, 3)).resolves.toEqual([{
      id: '228908',
      name: '晴天 (Live)',
      artists: ['周杰伦', '林俊杰'],
      album: '叶惠美',
      pictureId: '228908',
      audioId: '228908',
      lyricsId: '228908',
      platform: 'kuwo'
    }])
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('https://search.kuwo.cn/r.s?')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('pn=1')
  })

  it('uses the Kuwo anti-server playback endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      code: 200,
      msg: 'success',
      url: 'https://example.com/kuwo.mp3'
    })))

    await expect(getKuwoUrl('MUSIC_228908', 320)).resolves.toEqual({
      url: 'https://example.com/kuwo.mp3',
      br: 320
    })
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('rid=MUSIC_228908')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('br=320kmp3')
  })

  it('uses the signed Kugou member endpoint when login cookies are configured', async () => {
    musicCapabilityMocks.getMusicPlatformCookie.mockResolvedValueOnce(
      't=member-token; KugooID=10001; mid=device-mid; dfid=device-dfid'
    )
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { encode_album_audio_id: 'audio-id' }
      })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { play_url: 'https://example.com/member.mp3', filesize: 1024, bitrate: 320000 }
      })))

    await expect(getKugouUrl('song-hash', 320)).resolves.toEqual({
      url: 'https://example.com/member.mp3',
      size: 1024,
      br: 320
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('signature=')
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      cookie: expect.stringContaining('KugooID=10001')
    })
  })
})
