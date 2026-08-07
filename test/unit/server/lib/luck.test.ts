import { describe, expect, it } from 'vitest'
import {
  formatLuckMarkdown,
  formatLuckText,
  getLuck,
  LUCK_CATEGORY_COUNT,
  parseLuckId
} from '~~/server/lib/luck'

describe('luck helpers', () => {
  it('parses optional IDs without accepting partial numbers', () => {
    expect(parseLuckId('')).toBeUndefined()
    expect(parseLuckId(' 0 ')).toBe(0)
    expect(parseLuckId('18')).toBe(18)
    expect(parseLuckId('01')).toBeNull()
    expect(parseLuckId('-1')).toBeNull()
    expect(parseLuckId('1.0')).toBeNull()
    expect(parseLuckId('1abc')).toBeNull()
    expect(parseLuckId('9007199254740992')).toBeNull()
  })

  it('selects a category and tip deterministically when requested', () => {
    expect(getLuck(0, () => 0)).toEqual({
      id: 0,
      category: '人际运',
      rank: 27,
      tip: '人运旺盛！扩展人脉吧',
      tip_index: 0
    })
    expect(getLuck(LUCK_CATEGORY_COUNT)).toBeNull()
  })

  it('can randomly select from the complete category range', () => {
    const values = [0.999999, 0]
    const result = getLuck(undefined, () => values.shift() ?? 0)

    expect(result).toMatchObject({
      id: 18,
      category: '大凶',
      rank: -10,
      tip_index: 0
    })
    expect(LUCK_CATEGORY_COUNT).toBe(19)
  })

  it('formats text and Markdown responses', () => {
    const data = {
      id: 7,
      category: '大吉',
      rank: 10,
      tip: '今天运势不错!',
      tip_index: 2
    }

    expect(formatLuckText(data)).toBe('大吉：今天运势不错!')
    expect(formatLuckMarkdown(data)).toContain('## 大吉')
    expect(formatLuckMarkdown(data)).toContain('> 今天运势不错\\!')
    expect(formatLuckMarkdown(data)).toContain('**运势值：** 10')
    expect(formatLuckMarkdown(data)).toContain('类别 ID：7 · 提示 ID：2')
  })
})
