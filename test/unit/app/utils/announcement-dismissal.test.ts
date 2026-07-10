import { describe, expect, it } from 'vitest'
import {
  getLatestAnnouncementRevision,
  hasNewerAnnouncement
} from '@/utils/announcement-dismissal'

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
