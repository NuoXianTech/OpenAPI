export interface FriendLinkItem {
  id: number
  title: string
  url: string
  description: string | null
  isActive: boolean
}

export interface FriendLinkListResponse {
  code: number
  msg: string
  data: FriendLinkItem[]
}
