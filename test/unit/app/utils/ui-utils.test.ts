import { describe, expect, it } from 'vitest'
import { getLatestAnnouncementRevision, hasNewerAnnouncement } from '@/utils/announcement-dismissal'
import { createChartIndexedTickFormatter, formatChartIntegerTick, truncateChartAxisLabel } from '@/utils/chart-axis'
import { confirmationError, emailError, integerRangeError, passwordError, usernameError } from '@/utils/form-validation'
import { formatAdminIdentity, formatUserIdentity } from '@/utils/log-identity'
import { formatCompactCount, formatCount, formatPercent } from '@/utils/number-format'

describe('announcement dismissal', () => {
  it('uses the most recently updated announcement instead of display order', () => {
    const revision = getLatestAnnouncementRevision([
      { id: 10, updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 2, updatedAt: '2026-02-01T00:00:00.000Z' }
    ])

    expect(revision).toBe(`${Date.parse('2026-02-01T00:00:00.000Z')}:2`)
  })

  it('shows only revisions newer than the dismissed watermark', () => {
    expect(hasNewerAnnouncement('300:3', '200:2')).toBe(true)
    expect(hasNewerAnnouncement('200:2', '200:2')).toBe(false)
    expect(hasNewerAnnouncement('100:1', '200:2')).toBe(false)
    expect(hasNewerAnnouncement('200:2', '')).toBe(true)
  })
})

describe('chart axis utilities', () => {
  it('formats indexed labels with live rows and safe bounds', () => {
    let rows = [{ label: 'first' }, { label: 'second' }]
    const formatTick = createChartIndexedTickFormatter(() => rows, row => row.label)

    expect(formatTick(-10)).toBe('first')
    expect(formatTick(0.6)).toBe('second')
    expect(formatTick(99)).toBe('second')
    expect(formatTick('native')).toBe('native')
    expect(formatTick(new Date())).toBe('')

    rows = []
    expect(formatTick(0)).toBe('')
  })

  it('formats integer ticks and truncates long labels', () => {
    expect(formatChartIntegerTick(8.6)).toBe('9')
    expect(formatChartIntegerTick(new Date())).toBe('')
    expect(truncateChartAxisLabel('short')).toBe('short')
    expect(truncateChartAxisLabel('very-long-name')).toBe('very-l…')
  })
})

describe('form validation utilities', () => {
  it('validates authentication fields with user-facing errors', () => {
    expect(usernameError('username', '')?.message).toBe('用户名不能为空')
    expect(usernameError('username', 'valid_user')).toBeNull()
    expect(emailError('email', 'invalid')?.message).toBe('请输入有效的邮箱地址')
    expect(emailError('email', 'user@example.com')).toBeNull()
    expect(passwordError('password', 'short')?.message).toBe('密码至少 8 位')
    expect(confirmationError('confirm', 'different', 'password')?.message)
      .toBe('两次输入的密码不一致')
  })

  it('validates integer ranges without coercing invalid values', () => {
    expect(integerRangeError('timeoutMs', 100, '超时时间', 100, 120_000)).toBeNull()
    expect(integerRangeError('timeoutMs', 0, '超时时间', 100, 120_000)?.message)
      .toBe('超时时间必须是 100 到 120000 之间的整数')
    expect(integerRangeError('limit', 1.5, '限流', 0)?.message)
      .toBe('限流必须是不小于 0 的整数')
  })
})

describe('log identity labels', () => {
  it('keeps business users distinct from administrator audit actors', () => {
    expect(formatUserIdentity(1)).toBe('用户 #1')
    expect(formatAdminIdentity(1)).toBe('管理员 #1')
  })
})

describe('number format utilities', () => {
  it('formats counts with a stable locale', () => {
    expect(formatCount(1234567)).toBe('1,234,567')
    expect(formatCount(-1234)).toBe('-1,234')
  })

  it('formats compact non-negative integer counts', () => {
    expect(formatCompactCount(9999.9)).toBe('9,999')
    expect(formatCompactCount(12500)).toBe('1.3万')
    expect(formatCompactCount(-1)).toBe('0')
  })

  it('formats percentage-point values with configurable precision', () => {
    expect(formatPercent(98.126)).toBe('98.13%')
    expect(formatPercent(98.126, 1)).toBe('98.1%')
  })
})
