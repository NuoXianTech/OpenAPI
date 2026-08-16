import { describe, expect, it } from 'vitest'
import { formatBoxOffice, isMaoyanEncoding, isMaoyanRealtimeType, isValidMaoyanDate } from '~~/server/lib/maoyan'
import { formatMaoyanGlobalMarkdown, formatMaoyanGlobalText } from '~~/server/lib/maoyan/format'
import type { MaoyanGlobalData } from '~~/server/lib/maoyan'

const globalData: MaoyanGlobalData = {
  list: [{ rank: 1, maoyan_id: 1, movie_name: '测试电影', release_year: '2026', box_office: 100_000_000, box_office_desc: '1亿元' }],
  tip: '测试提示',
  update_time: '2026-07-14 08:00:00',
  update_time_at: 1_783_996_800_000
}

describe('maoyan helpers', () => {
  it('formats box office units', () => {
    expect(formatBoxOffice(100)).toBe('100元')
    expect(formatBoxOffice(10_000)).toBe('1万元')
    expect(formatBoxOffice(100_000_000)).toBe('1亿元')
  })

  it('validates realtime types, encodings, and calendar dates', () => {
    expect(isMaoyanRealtimeType('movie')).toBe(true)
    expect(isMaoyanRealtimeType('music')).toBe(false)
    expect(isMaoyanEncoding('markdown')).toBe(true)
    expect(isValidMaoyanDate('2024-02-29')).toBe(true)
    expect(isValidMaoyanDate('2026-02-29')).toBe(false)
    expect(isValidMaoyanDate('2026-13-01')).toBe(false)
  })

  it('formats global text and markdown output', () => {
    expect(formatMaoyanGlobalText(globalData)).toContain('1. 测试电影 (2026) - 1亿元')
    expect(formatMaoyanGlobalMarkdown(globalData)).toContain('| 1 | 测试电影 | 2026 | 1亿元 |')
  })
})
