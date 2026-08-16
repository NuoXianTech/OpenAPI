import { describe, expect, it } from 'vitest'
import { formatExchangeRateMarkdown, formatExchangeRateText, normalizeCurrencyCode } from '~~/server/lib/exchange-rate'
import type { ExchangeRateData } from '~~/server/lib/exchange-rate/types'

const data: ExchangeRateData = {
  base_code: 'CNY',
  updated: '2026-07-14 08:00:00',
  updated_at: 1783987200000,
  next_updated: '2026-07-15 08:00:00',
  next_updated_at: 1784073600000,
  rates: [
    { currency: 'CNY', rate: 1 },
    { currency: 'USD', rate: 0.1395 }
  ]
}

describe('exchange rate helpers', () => {
  it('normalizes ISO 4217-like currency codes', () => {
    expect(normalizeCurrencyCode(' usd ')).toBe('USD')
    expect(normalizeCurrencyCode('US')).toBeNull()
    expect(normalizeCurrencyCode('12A')).toBeNull()
  })

  it('formats the plain-text response', () => {
    expect(formatExchangeRateText(data)).toBe('2026-07-14 的 CNY 汇率\n\nCNY => 1\nUSD => 0.1395')
  })

  it('formats the markdown response', () => {
    const markdown = formatExchangeRateMarkdown(data)
    expect(markdown).toContain('# CNY 汇率')
    expect(markdown).toContain('| **USD** | 0.1395 |')
    expect(markdown).toContain('*下次更新: 2026-07-15 08:00:00*')
  })
})
