import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatTodayInHistoryMarkdown,
  formatTodayInHistoryText,
  getTodayInHistory,
  normalizeHistoryMonthResponse,
  parseTodayInHistoryDate,
  type TodayInHistoryData
} from '~~/server/lib/today-in-history'

const sharedCacheMocks = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  getSharedCache: vi.fn(async (options: { key: string, loader: () => Promise<unknown> }) => {
    if (sharedCacheMocks.values.has(options.key)) return sharedCacheMocks.values.get(options.key)
    const value = await options.loader()
    sharedCacheMocks.values.set(options.key, value)
    return value
  })
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
  sharedCacheMocks.values.clear()
})

describe('today in history helpers', () => {
  it('uses the Shanghai calendar day and validates explicit dates', () => {
    expect(parseTodayInHistoryDate('', Date.UTC(2026, 6, 31, 16, 30))).toEqual({
      date: '08-01',
      month: 8,
      day: 1,
      dayKey: '0801'
    })
    expect(parseTodayInHistoryDate('8-1')).toMatchObject({ date: '08-01', month: 8, day: 1 })
    expect(parseTodayInHistoryDate('2024-02-29')).toMatchObject({ date: '02-29', month: 2, day: 29 })
    expect(parseTodayInHistoryDate('02-29')).toMatchObject({ date: '02-29', month: 2, day: 29 })
    expect(parseTodayInHistoryDate('2023-02-29')).toBeNull()
    expect(parseTodayInHistoryDate('02-30')).toBeNull()
    expect(parseTodayInHistoryDate('2026/08/01')).toBeNull()
  })

  it('normalizes, sanitizes, sorts and deduplicates Baidu history events', () => {
    const normalized = normalizeHistoryMonthResponse({
      '08': {
        '0801': [
          {
            year: '2001',
            title: '<a href="https://example.com">后发生的事件</a>',
            desc: '描述 &amp; 详情',
            type: 'unknown',
            link: 'https://example.com/not-allowed'
          },
          {
            year: '-10',
            title: '<strong>较早人物</strong>出生',
            desc: '公元前人物&#12290;',
            type: 'birth',
            link: 'http://baike.baidu.com/item/example'
          },
          {
            year: '-10',
            title: '<strong>较早人物</strong>出生',
            desc: '重复记录',
            type: 'birth',
            link: 'https://baike.baidu.com/item/example'
          },
          {
            year: '2002',
            title: '带有不安全链接的事件',
            desc: '链接应被移除',
            type: 'event',
            link: 'https://user:password@baike.baidu.com:444/item/example'
          },
          { year: '', title: '无效记录' }
        ]
      }
    }, 8)

    expect(normalized['0801']).toEqual([
      {
        title: '较早人物出生',
        year: '-10',
        description: '公元前人物。',
        event_type: 'birth',
        link: 'https://baike.baidu.com/item/example'
      },
      {
        title: '后发生的事件',
        year: '2001',
        description: '描述 & 详情',
        event_type: 'event',
        link: ''
      },
      {
        title: '带有不安全链接的事件',
        year: '2002',
        description: '链接应被移除',
        event_type: 'event',
        link: ''
      }
    ])
  })

  it('caches normalized monthly data and forwards the governance signal', async () => {
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      '08': {
        '0801': [{
          year: '2008',
          title: '测试事件',
          desc: '测试描述',
          type: 'event',
          link: 'https://baike.baidu.com/item/test'
        }]
      }
    })))
    const date = parseTodayInHistoryDate('08-01')!
    const controller = new AbortController()

    const first = await getTodayInHistory(date, controller.signal)
    const second = await getTodayInHistory(date, controller.signal)

    expect(first).toEqual({
      date: '08-01',
      month: 8,
      day: 1,
      items: [{
        title: '测试事件',
        year: '2008',
        description: '测试描述',
        event_type: 'event',
        link: 'https://baike.baidu.com/item/test'
      }],
      total: 1
    })
    expect(second).toEqual(first)
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(1)
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[0]).toBe('https://baike.baidu.com/cms/home/eventsOnHistory/08.json')
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[1]).toMatchObject({
      allowedHosts: ['baike.baidu.com'],
      signal: controller.signal
    })
    expect(sharedCacheMocks.getSharedCache).toHaveBeenCalledWith(expect.objectContaining({
      key: 'cache:today-in-history:month:08',
      ttlSeconds: 86400
    }))
  })

  it('formats readable text and markdown representations', () => {
    const data: TodayInHistoryData = {
      date: '08-01',
      month: 8,
      day: 1,
      items: [{
        title: '测试 [事件] *强调*',
        year: '未知_[年份]',
        description: '> 引用 ![远程图片](https://example.com/image.png)',
        event_type: 'birth',
        link: 'https://baike.baidu.com/item/test'
      }],
      total: 1
    }

    expect(formatTodayInHistoryText(data)).toContain('1. 未知_[年份] 年 · 出生：测试 [事件] *强调*')
    const markdown = formatTodayInHistoryMarkdown(data)
    expect(markdown).toContain('[测试 \\[事件\\] \\*强调\\*](<https://baike.baidu.com/item/test>)')
    expect(markdown).toContain('未知\\_\\[年份\\] 年')
    expect(markdown).toContain('\\> 引用 \\!\\[远程图片\\]\\(https://example\\.com/image\\.png\\)')
    expect(markdown).not.toContain('![远程图片]')
  })

  it('rejects malformed upstream month data', () => {
    expect(() => normalizeHistoryMonthResponse({ code: 500 }, 8)).toThrow('无效月份数据')
    expect(() => normalizeHistoryMonthResponse({ '08': { '0801': [] } }, 8)).toThrow('未返回可用事件')
    expect(() => normalizeHistoryMonthResponse({
      '08': {
        '0899': [{ year: '2000', title: '不存在的日期', type: 'event' }]
      }
    }, 8)).toThrow('未返回可用事件')
  })
})
