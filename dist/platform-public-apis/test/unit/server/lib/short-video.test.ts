import { describe, expect, it } from 'vitest'
import {
  detectShortVideoPlatform,
  normalizeShortVideoPayload,
  parseShortVideoUrl
} from '~~/server/lib/short-video'
import { extractBilibiliId } from '~~/server/lib/short-video/platforms/bilibili'
import {
  extractDouyinDetailFromHtml,
  formatDouyinDetail
} from '~~/server/lib/short-video/platforms/douyin'
import { parseKuaishouPage } from '~~/server/lib/short-video/platforms/kuaishou'
import { extractPipigxParams } from '~~/server/lib/short-video/platforms/pipigx'
import { extractPipixiaItemId } from '~~/server/lib/short-video/platforms/pipixia'
import {
  extractToutiaoRenderData,
  extractToutiaoVideoId
} from '~~/server/lib/short-video/platforms/toutiao'
import { extractWeiboVideoId } from '~~/server/lib/short-video/platforms/weibo'
import {
  extractXiaohongshuNoteFromHtml,
  formatXiaohongshuNote
} from '~~/server/lib/short-video/platforms/xiaohongshu'

function readThrownError(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('Expected function to throw')
}

describe('short video input', () => {
  it('extracts the first URL from a complete share message', () => {
    const url = parseShortVideoUrl('复制此链接打开抖音：https://v.douyin.com/example/。更多内容')
    expect(url.toString()).toBe('https://v.douyin.com/example/')
  })

  it('rejects credential URLs and unsupported hosts', () => {
    expect(readThrownError(() => parseShortVideoUrl('https://user:pass@v.douyin.com/example/')))
      .toMatchObject({ code: 'INVALID_PARAMETER', status: 400 })

    const unsupportedUrl = parseShortVideoUrl('https://douyin.com.evil.test/video/1')
    expect(readThrownError(() => detectShortVideoPlatform(unsupportedUrl)))
      .toMatchObject({ code: 'UNSUPPORTED_PLATFORM', status: 422 })
  })

  it.each([
    ['douyin', 'https://v.douyin.com/example/'],
    ['kuaishou', 'https://v.kuaishou.com/example'],
    ['xiaohongshu', 'https://xhslink.com/a/example'],
    ['bilibili', 'https://b23.tv/example'],
    ['weibo', 'https://t.cn/example'],
    ['pipixia', 'https://h5.pipix.com/s/example'],
    ['pipigx', 'https://share.ippzone.com/pp/post/example'],
    ['toutiao', 'https://www.ixigua.com/example']
  ] as const)('detects %s links', (platform, input) => {
    expect(detectShortVideoPlatform(parseShortVideoUrl(input))).toBe(platform)
  })
})

describe('short video platform parsing', () => {
  it('extracts Douyin detail state from the official share page', () => {
    const detail = {
      aweme_id: '7400000000000000000',
      desc: '抖音示例',
      create_time: 1_555_982_844,
      author: {
        unique_id: 'rmrbxmt'
      },
      authorInfo: {
        nickname: '人民日报',
        uid: '100',
        avatarThumb: {
          urlList: ['https://image.example.com/avatar.jpg']
        }
      },
      statistics: {
        digg_count: 13_089_857
      },
      video: {
        play_addr: {
          url_list: ['https://video.example.com/douyin.mp4']
        }
      },
      music: {
        ownerNickname: '人民日报',
        coverThumb: {
          urlList: ['https://image.example.com/music-avatar.jpg']
        }
      }
    }
    const state = encodeURIComponent(JSON.stringify({ app: { videoDetail: detail } }))
    const html = `<script id="RENDER_DATA" type="application/json">${state}</script>`

    expect(extractDouyinDetailFromHtml(html)).toEqual(detail)
    expect(normalizeShortVideoPayload(
      formatDouyinDetail(detail, detail.aweme_id),
      'douyin'
    )).toMatchObject({
      author: '人民日报',
      uid: 'rmrbxmt',
      avatar: 'https://image.example.com/avatar.jpg',
      like: 13_089_857,
      time: 1_555_982_844,
      title: '抖音示例',
      url: 'https://video.example.com/douyin.mp4',
      music: {
        author: '人民日报',
        avatar: 'https://image.example.com/music-avatar.jpg'
      }
    })
  })

  it('parses Kuaishou INIT_STATE media without a remote parser service', () => {
    const state = {
      'tusjoh:example': {
        photo: {
          caption: '快手示例',
          userName: '示例作者',
          headUrl: 'https://image.example.com/avatar.jpg',
          coverUrls: [{ url: 'https://image.example.com/cover.jpg' }],
          mainMvUrls: [{ url: 'https://video.example.com/kuaishou.mp4' }]
        }
      }
    }
    const html = `<script>window.INIT_STATE = ${JSON.stringify(state)};</script>`

    expect(parseKuaishouPage(html, new URL('https://www.kuaishou.com/short-video/example')))
      .toMatchObject({
        code: 200,
        data: {
          type: 'video',
          title: '快手示例',
          url: 'https://video.example.com/kuaishou.mp4'
        }
      })
  })

  it('extracts and formats Xiaohongshu initial state', () => {
    const noteId = '66aa11bb22cc33dd44ee55ff'
    const note = {
      type: 'video',
      title: '小红书示例',
      desc: '示例描述',
      user: {
        nickname: '示例作者',
        userId: 'user-1',
        avatar: 'https://image.example.com/avatar.jpg'
      },
      imageList: [{ urlDefault: 'https://image.example.com/cover.jpg' }],
      video: {
        media: {
          stream: {
            h265: [{ avgBitrate: 2_000, masterUrl: 'https://video.example.com/h265.mp4' }],
            h264: [{ avgBitrate: 3_000, masterUrl: 'https://video.example.com/h264.mp4' }]
          }
        }
      }
    }
    const state = { note: { noteDetailMap: { [noteId]: { note } } } }
    const html = `<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)}</script>`
    const extracted = extractXiaohongshuNoteFromHtml(html, noteId)

    expect(extracted).toEqual(note)
    expect(formatXiaohongshuNote(extracted || {})).toMatchObject({
      code: 200,
      data: {
        type: 'video',
        title: '小红书示例',
        cover: 'https://image.example.com/cover.jpg',
        url: 'https://video.example.com/h265.mp4',
        video_backup: ['https://video.example.com/h264.mp4']
      }
    })
  })

  it('extracts official platform identifiers and parameters', () => {
    expect(extractBilibiliId(new URL('https://www.bilibili.com/video/BV1GJ411x7h7')))
      .toBe('BV1GJ411x7h7')
    expect(extractWeiboVideoId(new URL('https://weibo.com/tv/show/1034:5000000000000000')))
      .toBe('1034:5000000000000000')
    expect(extractPipixiaItemId(new URL('https://h5.pipix.com/item/123456789')))
      .toBe('123456789')
    expect(extractPipigxParams(new URL('https://share.ippzone.com/post?pid=123&mid=456')))
      .toEqual({ pid: '123', mid: '456' })
    expect(extractToutiaoVideoId(new URL('https://www.toutiao.com/video/7400000000000000000')))
      .toBe('7400000000000000000')
  })

  it('decodes Toutiao RENDER_DATA from the official page', () => {
    const state = {
      data: {
        itemId: '7400000000000000000',
        initialVideo: { title: '头条示例' }
      }
    }
    const html = `<script id="RENDER_DATA" type="application/json">${encodeURIComponent(JSON.stringify(state))}</script>`

    expect(extractToutiaoRenderData(html)).toEqual(state)
  })
})

describe('short video response normalization', () => {
  it('normalizes Bilibili fields into a flat response', () => {
    const result = normalizeShortVideoPayload({
      code: 200,
      msg: '解析成功',
      data: {
        title: '示例视频',
        description: '视频简介',
        cover: 'https://image.example.com/cover.jpg',
        auther: '示例作者',
        uid: '42',
        avatar: 'https://image.example.com/avatar.jpg',
        like: 12_345,
        time: 1_555_982_844,
        url: 'https://video.example.com/part-1.mp4'
      }
    }, 'bilibili')

    expect(result).toMatchObject({
      platform: 'bilibili',
      type: 'video',
      author: '示例作者',
      uid: '42',
      avatar: 'https://image.example.com/avatar.jpg',
      like: 12_345,
      time: 1_555_982_844,
      title: '示例视频',
      cover: 'https://image.example.com/cover.jpg',
      url: 'https://video.example.com/part-1.mp4'
    })
  })

  it('normalizes Douyin author, timestamp, main URL, and music aliases', () => {
    const result = normalizeShortVideoPayload({
      code: 200,
      data: {
        type: 'video',
        desc: '抖音示例',
        author: {
          name: '作者',
          id: '100',
          avatar: 'https://image.example.com/avatar.jpg'
        },
        like: 13_089_857,
        time: 1_555_982_844_000,
        url: 'https://video.example.com/main.mp4',
        video_id: 'video-1',
        video_backup: [
          'https://video.example.com/main.mp4',
          'https://video.example.com/backup.mp4',
          { url: 'https://video.example.com/backup.mp4' }
        ],
        duration: 15_000,
        music: {
          name: '背景音乐',
          artist: '音乐作者',
          url: 'https://audio.example.com/music.mp3',
          cover: 'https://image.example.com/music.jpg'
        }
      }
    }, 'douyin')

    expect(result).toMatchObject({
      author: '作者',
      uid: '100',
      avatar: 'https://image.example.com/avatar.jpg',
      like: 13_089_857,
      time: 1_555_982_844,
      url: 'https://video.example.com/main.mp4',
    })
    expect(result.music).toMatchObject({
      title: '背景音乐',
      author: '音乐作者',
      url: 'https://audio.example.com/music.mp3',
      avatar: 'https://image.example.com/music.jpg'
    })
  })

  it('uses the first available Weibo media URL', () => {
    const result = normalizeShortVideoPayload({
      code: 200,
      data: {
        type: 'video',
        title: '微博视频',
        author: {
          name: '作者'
        },
        url: 'https://video.example.com/hd.mp4',
        duration: 23,
        video_backup: [
          { label: '1080P', url: 'https://video.example.com/hd.mp4' },
          { label: '720P', url: 'https://video.example.com/sd.mp4' }
        ]
      }
    }, 'weibo')

    expect(result.url).toBe('https://video.example.com/hd.mp4')
  })

  it('normalizes image and live-photo collections without duplicates', () => {
    const result = normalizeShortVideoPayload({
      code: 200,
      data: {
        type: 'live',
        title: '实况图集',
        images: [
          'https://image.example.com/1.jpg',
          'https://image.example.com/1.jpg'
        ],
        live_photo: [
          {
            image: 'https://image.example.com/1.jpg',
            video: 'https://video.example.com/1.mp4'
          },
          {
            image: 'https://image.example.com/1.jpg',
            video: 'https://video.example.com/1.mp4'
          },
          {
            image: 'https://image.example.com/2.jpg',
            video: 'https://video.example.com/2.mp4'
          }
        ]
      }
    }, 'xiaohongshu')

    expect(result.type).toBe('live')
    expect(result.images).toEqual([
      'https://image.example.com/1.jpg',
      'https://image.example.com/2.jpg'
    ])
    expect(result.livePhotos).toHaveLength(2)
    expect(result.url).toBe('')
  })

  it('maps upstream saturation and parse failures to stable errors', () => {
    expect(readThrownError(() => normalizeShortVideoPayload({
      code: 503,
      msg: '当前并发请求已满',
      data: { retry_after: 8 }
    }, 'douyin'))).toMatchObject({
      code: 'UPSTREAM_BUSY',
      status: 503,
      retryAfter: 8
    })

    expect(readThrownError(() => normalizeShortVideoPayload({
      code: 0,
      msg: '解析失败'
    }, 'bilibili'))).toMatchObject({
      code: 'PARSE_FAILED',
      status: 422
    })
  })
})
