import { describe, expect, it } from 'vitest'
import {
  findFuelRegion,
  formatFuelPriceMarkdown,
  parseFuelPrices,
  parseFuelTrend
} from '~~/server/lib/fuel-price/price'
import type { FuelPriceData } from '~~/server/lib/fuel-price/types'

const priceHtml = `
  <div id="youjia">
    <dl>
      <dt>北京92号汽油</dt><dd>7.21</dd>
      <dt>北京95号汽油</dt><dd>7.68</dd>
      <dt>北京0号柴油</dt><dd>6.93</dd>
    </dl>
  </div>
  <div id="youjiaCont">
    <div style="border:1px solid #EA5146">
      下次油价7月15日24时调整，预计上调110元/吨(0.08元/升-0.10元/升)
    </div>
  </div>
`

describe('fuel price helpers', () => {
  it('matches regions by suffix', () => {
    expect(findFuelRegion('北京')?.region).toBe('北京')
    expect(findFuelRegion('杭州')?.region).toBe('浙江杭州')
    expect(findFuelRegion('不存在')).toBeNull()
  })

  it('parses fuel prices from qiyoujiage html', () => {
    expect(parseFuelPrices(priceHtml)).toEqual([
      { name: '92号汽油', price: 7.21, price_desc: '7.21 元/升' },
      { name: '95号汽油', price: 7.68, price_desc: '7.68 元/升' },
      { name: '0号柴油', price: 6.93, price_desc: '6.93 元/升' }
    ])
  })

  it('parses price adjustment trend', () => {
    expect(parseFuelTrend(priceHtml)).toEqual({
      next_adjustment_date: '7月15日24时',
      direction: '上调',
      change_ton: 110,
      change_ton_desc: '上调110元/吨',
      change_liter_min: 0.08,
      change_liter_max: 0.1,
      change_liter_desc: '0.08元/升-0.10元/升',
      description: '下次调价时间: 7月15日24时，预计上调110元/吨 (0.08元/升-0.10元/升)'
    })
  })

  it('formats markdown output', () => {
    const data: FuelPriceData = {
      region: '北京',
      items: parseFuelPrices(priceHtml),
      trend: parseFuelTrend(priceHtml),
      link: 'http://www.qiyoujiage.com/beijing.shtml',
      updated: '2026-07-10 08:00:00',
      updated_at: 1783641600000
    }

    expect(formatFuelPriceMarkdown(data)).toContain('# 今日油价 (北京)')
    expect(formatFuelPriceMarkdown(data)).toContain('- **92号汽油**: 7.21 元/升')
    expect(formatFuelPriceMarkdown(data)).toContain('更新时间: 2026-07-10 08:00:00')
  })
})
