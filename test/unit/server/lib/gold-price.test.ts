import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  formatGoldPriceMarkdown,
  formatGoldPriceText,
  getGoldPrice,
  normalizeGoldPriceResponse,
  parseGoldQuoteScript,
  type GoldPriceData
} from '~~/server/lib/gold-price'

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

function quote(price: number, time: number, options: Record<string, unknown> = {}) {
  return {
    q63: price,
    q1: price - 1,
    q3: price + 2,
    q4: price - 3,
    digits: 2,
    unit: '元/克',
    time,
    ...options
  }
}

describe('gold price helpers', () => {
  it('parses the upstream script and normalizes all price groups', () => {
    const now = Date.parse('2026-08-01T06:00:00Z')
    const payload = parseGoldQuoteScript(`var quote_json = ${JSON.stringify({
      flag: true,
      JO_71: quote(881, now),
      JO_70: quote(1000, now, { digits: 0 }),
      JO_92233: quote(4041.09, now, { unit: '美元/盎司' }),
      JO_42660: quote(1226, now),
      JO_78648: quote(896.5, now),
      JO_321453: quote(873, now)
    })};`)
    const data = normalizeGoldPriceResponse(payload, now)

    expect(data.date).toBe('2026-08-01')
    expect(data.metals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: '黄金_9999',
        sell_price: '881',
        today_price: '880',
        high_price: '883',
        low_price: '878',
        unit: '元/克',
        updated: '2026-08-01 14:00:00',
        updated_at: now
      }),
      expect.objectContaining({ name: '黄金_9995', sell_price: '1000' }),
      expect.objectContaining({ name: '伦敦金(现货黄金)', sell_price: '4041.09', unit: '美元/盎司' })
    ]))
    expect(data.stores).toEqual([
      expect.objectContaining({ brand: '周大福', product: '黄金', price: '1226', formatted: '1226元/克' })
    ])
    expect(data.banks).toEqual([
      expect.objectContaining({ bank: '建设银行', product: '龙鼎金条', price: '896.5', time: '14:00:00' })
    ])
    expect(data.recycle).toEqual([
      expect.objectContaining({ type: '黄金回收', price: '873', purity: '99.90%' })
    ])
  })

  it('uses the shared cache and forwards the governance signal', async () => {
    const timestamp = Date.now()
    safeFetchMocks.safeFetch.mockResolvedValueOnce(new Response(`var quote_json = ${JSON.stringify({
      flag: true,
      JO_71: quote(881, timestamp)
    })};`))
    const controller = new AbortController()

    const first = await getGoldPrice(controller.signal)
    const second = await getGoldPrice(controller.signal)

    expect(first.metals).toHaveLength(1)
    expect(second).toEqual(first)
    expect(safeFetchMocks.safeFetch).toHaveBeenCalledTimes(1)
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[0]).toContain('https://api.jijinhao.com/quoteCenter/realTime.htm?codes=')
    expect(safeFetchMocks.safeFetch.mock.calls[0]?.[1]).toMatchObject({
      allowedHosts: ['api.jijinhao.com'],
      signal: controller.signal
    })
    expect(sharedCacheMocks.getSharedCache).toHaveBeenCalledWith(expect.objectContaining({
      key: 'cache:gold-price:cn',
      ttlSeconds: 120
    }))
  })

  it('formats readable text and escaped markdown tables', () => {
    const timestamp = Date.parse('2026-08-01T06:00:00Z')
    const data: GoldPriceData = {
      date: '2026-08-01',
      metals: [{
        name: '黄金 | 测试',
        sell_price: '881',
        today_price: '880',
        high_price: '883',
        low_price: '878',
        unit: '元/克',
        updated: '2026-08-01 14:00:00',
        updated_at: timestamp
      }],
      stores: [{
        brand: '品牌 | 测试',
        product: '黄金',
        price: '1226',
        unit: '元/克',
        formatted: '1226元/<克>',
        updated: '2026-08-01',
        updated_at: timestamp + 60_000
      }],
      banks: [],
      recycle: []
    }

    expect(formatGoldPriceText(data)).toContain('黄金 | 测试: 881元/克')
    expect(formatGoldPriceText(data)).toContain('贵金属价格 (2026-08-01 14:01:00)')
    const markdown = formatGoldPriceMarkdown(data)
    expect(markdown).toContain('**更新时间**：2026-08-01 14:01:00')
    expect(markdown).toContain('| 黄金 \\| 测试 | 881 | 880 | 883 | 878 | 元/克 |')
    expect(markdown).toContain('| 品牌 \\| 测试 | 黄金 | 1226元/\\<克\\> | 2026-08-01 |')
    expect(markdown).toContain('| 暂无数据 | - | - | - |')
  })

  it('rejects malformed or empty upstream data', () => {
    expect(() => parseGoldQuoteScript('{"flag":true}')).toThrow('格式已变化')
    expect(() => normalizeGoldPriceResponse({ flag: false })).toThrow('未返回可用贵金属行情')
    expect(() => normalizeGoldPriceResponse({ JO_71: { q63: null } })).toThrow('未返回可用贵金属行情')
  })
})
