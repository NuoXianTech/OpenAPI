export const MESSAGE_LEVELS = ['info', 'success', 'warning', 'critical'] as const

export type MessageLevel = typeof MESSAGE_LEVELS[number]

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

export interface FriendLinkItem {
  id: number
  title: string
  url: string
  description: string | null
  isActive: boolean
}
