export type FabMenuActionType = 'link' | 'route' | 'iframe'

export interface FabMenuItem {
  id: number
  title: string
  subtitle: string | null
  icon: string
  actionType: FabMenuActionType
  actionValue: string
  actionLabel: string
  target: string
  sort: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}
