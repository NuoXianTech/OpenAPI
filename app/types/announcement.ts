import type { MessageLevel } from '~/types/message-level'

export interface Announcement {
  id: number
  title: string
  content: string
  level: MessageLevel
  isPinned: boolean
  isEnabled: boolean
  linkUrl: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}
