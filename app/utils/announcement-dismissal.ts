interface AnnouncementRevisionSource {
  id: number
  updatedAt: string
}

interface AnnouncementRevision {
  timestamp: number
  id: number
}

function parseAnnouncementRevision(value: string): AnnouncementRevision | null {
  const [timestampValue, idValue] = value.split(':')
  const timestamp = Number(timestampValue)
  const id = Number(idValue)

  return Number.isFinite(timestamp) && Number.isInteger(id)
    ? { timestamp, id }
    : null
}

function compareAnnouncementRevisions(
  left: AnnouncementRevision,
  right: AnnouncementRevision
): number {
  if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp
  return left.id - right.id
}

export function getLatestAnnouncementRevision(
  announcements: readonly AnnouncementRevisionSource[]
): string {
  let latestRevision: AnnouncementRevision | null = null

  for (const announcement of announcements) {
    const timestamp = Date.parse(announcement.updatedAt)
    if (!Number.isFinite(timestamp)) continue

    const revision = { timestamp, id: announcement.id }
    if (!latestRevision || compareAnnouncementRevisions(revision, latestRevision) > 0) {
      latestRevision = revision
    }
  }

  return latestRevision ? `${latestRevision.timestamp}:${latestRevision.id}` : ''
}

export function hasNewerAnnouncement(
  currentRevision: string,
  dismissedRevision: string
): boolean {
  const current = parseAnnouncementRevision(currentRevision)
  if (!current) return false

  const dismissed = parseAnnouncementRevision(dismissedRevision)
  if (!dismissed) return true

  return compareAnnouncementRevisions(current, dismissed) > 0
}
