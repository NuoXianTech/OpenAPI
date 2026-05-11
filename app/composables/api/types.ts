export interface ApiCatalogItem {
  id: number
  name: string
  status: number
  categoryId: number | null
  shortDesc: string
  description: string
  httpMethod: string
  apiPath: string
  docUrl: string
  isApiKey: boolean
  costCredits: number
  totalCalls: number
}

export interface ApiCatalogFilters {
  keyword?: string
  status?: number
  categoryId?: number
}

export interface ApiTabOption {
  label: string
  value: string | number
}

export interface ApiCategoryItem {
  id: number
  code: string
  name: string
  icon?: string | null
  color?: string | null
  sortOrder: number
  isEnabled: boolean
}
