const FUEL_PRICE_ENCODINGS = ['json', 'text', 'markdown', 'md'] as const
export const DEFAULT_FUEL_PRICE_ENCODING: FuelPriceEncoding = 'json'
export const DEFAULT_FUEL_PRICE_REGION = '北京'

export type FuelPriceEncoding = typeof FUEL_PRICE_ENCODINGS[number]

export interface FuelRegion {
  region: string
  url: string
}

export interface FuelPriceItem {
  name: string
  price: number
  price_desc: string
}

export interface FuelTrend {
  /** 下次调价日期，如 "2月24日24时" */
  next_adjustment_date: string
  /** 涨跌方向：上调 / 下调 / 搁浅 */
  direction: string
  /** 每吨变化量（元），如 110 */
  change_ton: number
  /** 每吨变化描述，如 "上调110元/吨" */
  change_ton_desc: string
  /** 每升最小变化量（元），如 0.08 */
  change_liter_min: number
  /** 每升最大变化量（元），如 0.10 */
  change_liter_max: number
  /** 每升变化描述，如 "0.08元/升-0.10元/升" */
  change_liter_desc: string
  /** 完整描述 */
  description: string
}

export interface FuelPriceData {
  region: string
  trend: FuelTrend | null
  items: FuelPriceItem[]
  link: string
  updated: string
  updated_at: number
}

export interface FuelRegionOption extends FuelRegion {
  link: string
}

export function isFuelPriceEncoding(value: string): value is FuelPriceEncoding {
  return FUEL_PRICE_ENCODINGS.includes(value as FuelPriceEncoding)
}
