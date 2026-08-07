import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatDaily60sMarkdown,
  formatDaily60sText,
  getDaily60s,
  normalizeDaily60sResponse,
  parseDaily60sDate
} from '~~/server/lib/60s'

const sharedCacheMocks = vi.hoisted(() => ({
  getSharedCache: vi.fn(async (options: { loader: () => Promise<unknown> }) => options.loader())
}))

const safeFetchMocks = vi.hoisted(() => ({
  safeFetch: vi.fn(),
  readLimitedText: vi.fn((response: Response) => response.text())
}))

vi.mock('~~/server/utils/shared-cache', () => ({
  getSharedCache: sharedCacheMocks.getSharedCache
}))

vi.mock('~~/server/utils/safe-fetch', () => ({
  safeFetch: safeFetchMocks.safeFetch,
  readLimitedText: safeFetchMocks.readLimitedText
}))

afterEach(() => {
  vi.clearAllMocks()
})

function createPayload(date: string) {
  return {
    date,
    news: ['第一条新闻', { title: '第二条新闻', link: 'https://example.com/news' }, '', { title: '' }],
    cover: 'https://mmbiz.qpic.cn/cover.jpg',
    tip: '每日微语',
    image: `https://cdn.jsdmirror.com/gh/example/${date}.png`,
    link: 'https://mp.weixin.qq.com/s/example',
    created: '2026/08/07 07:39',
    created_at: 1786059555983,
    updated: '2026/08/07 07:40',
    updated_at: 1786059600000
  }
}

describe('daily 60s helpers', () => {
  it('uses the Shanghai calendar day and validates explicit dates', () => {
    expect(parseDaily60sDate('', Date.UTC(2026, 7, 6, 16, 30))).toBe('2026-08-07')
    expect(parseDaily60sDate('2024-02-29')).toBe('2024-02-29')
    expect(parseDaily60sDate('2023-02-29')).toBeNull()
    expect(parseDaily60sDate('2026-8-7')).toBeNull()
    expect(parseDaily60sDate('2026/08/07')).toBeNull()
  })

  it('normalizes the upstream response and removes unsafe fields and URLs', () => {
    const normalized = normalizeDaily60sResponse({
      ...createPayload('2026-08-07'),
      link: 'javascript:alert(1)',
      ignored: 'not exposed'
    }, '2026-08-07', 1786089268780)

    expect(normalized).toMatchObject({
      date: '2026-08-07',
      news: ['第一条新闻', '第二条新闻'],
      cover: 'https://mmbiz.qpic.cn/cover.jpg',
      tip: '每日微语',
      link: '',
      day_of_week: '星期五',
      lunar_date: '丙午年六月廿五',
      api_updated_at: 1786089268780
    })
    expect(normalized).not.toHaveProperty('image')
    expect(normalized).not.toHaveProperty('ignored')
  })

  it('falls back up to two days and forwards the request signal', async () => {
    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockRejectedValueOnce(new Error('备用源暂不可用'))
      .mockResolvedValueOnce(new Response(JSON.stringify(createPayload('2026-08-06'))))
    const controller = new AbortController()

    const data = await getDaily60s('2026-08-07', { fallback: true, signal: controller.signal })

    expect(data.date).toBe('2026-08-06')
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(3)
    expect(safeFetchMocks.safeFetch.mock.calls[2]?.[0]).toBe('https://60s-static.viki.moe/60s/2026-08-06.json')
    expect(safeFetchMocks.safeFetch.mock.calls[2]?.[1]).toMatchObject({
      allowedHosts: ['60s-static.viki.moe'],
      signal: controller.signal
    })
    expect(sharedCacheMocks.getSharedCache).toHaveBeenLastCalledWith(expect.objectContaining({
      key: 'cache:60s:2026-08-06',
      ttlSeconds: 1800,
      signal: controller.signal
    }))
  })

  it('does not fall back when an explicit date is unavailable', async () => {
    safeFetchMocks.safeFetch
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }))

    await expect(getDaily60s('2026-01-01')).rejects.toThrow('2026-01-01 暂无每日 60 秒内容')
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(2)
  })

  it('formats readable text and escaped markdown output', () => {
    const data = normalizeDaily60sResponse({
      ...createPayload('2026-08-07'),
      news: ['测试 [新闻] *强调*'],
      tip: '> 不可信的 ![图片](https://example.com/image.png)'
    }, '2026-08-07')

    expect(formatDaily60sText(data)).toContain('1. 测试 [新闻] *强调*')
    const markdown = formatDaily60sMarkdown(data)
    expect(markdown).toContain('1. 测试 \\[新闻\\] \\*强调\\*')
    expect(markdown).toContain('\\> 不可信的 \\!\\[图片\\]\\(https://example\\.com/image\\.png\\)')
    expect(markdown).not.toContain('![图片](https://example.com/image.png)')
  })

  it('rejects malformed upstream responses', () => {
    expect(() => normalizeDaily60sResponse({ date: '2026-08-07', news: [] }, '2026-08-07')).toThrow('未返回新闻内容')
    expect(() => normalizeDaily60sResponse(createPayload('2026-08-06'), '2026-08-07')).toThrow('无效数据')
  })
})
