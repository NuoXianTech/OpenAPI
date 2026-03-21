export interface ApiCatalogItem {
  id: number
  name: string
  status: number
  category: string | null
  shortDesc: string
  description: string
  httpMethod: string
  apiPath: string
  docUrl: string
  isApiKey: boolean
  totalCalls: number
}

export interface ApiCatalogResponse {
  code: number
  msg: string
  data: ApiCatalogItem[]
  timestamp: number
}

export interface ApiCatalogFilters {
  keyword?: string
  status?: number
  category?: string
}

export interface ApiTabOption {
  label: string
  value: string | number
}