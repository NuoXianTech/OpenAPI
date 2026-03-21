export interface ApiCatalogItem {
  id: number
  name: string
  description: string
  docurl: string
  url: string
  method: string
  count: string
  status: number
}

export interface ApiCatalogResponse {
  code: number
  msg: string
  data: ApiCatalogItem[]
  timestamp: number
}