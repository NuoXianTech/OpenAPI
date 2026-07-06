import { API_STATUS } from '#shared/config/api-status'

export interface ApiStatusSelectItem {
  label: string
  value: number
}

export const ADMIN_API_STATUS_ITEMS: ApiStatusSelectItem[] = [
  { label: '自动', value: API_STATUS.automatic },
  { label: '正常', value: API_STATUS.normal },
  { label: '异常', value: API_STATUS.abnormal },
  { label: '未知', value: API_STATUS.unknown },
  { label: '维护', value: API_STATUS.maintenance },
  { label: '废弃', value: API_STATUS.deprecated }
]

export const PUBLIC_API_STATUS_FILTER_ITEMS: ApiStatusSelectItem[] = [
  { label: '正常', value: API_STATUS.normal },
  { label: '异常', value: API_STATUS.abnormal },
  { label: '维护', value: API_STATUS.maintenance },
  { label: '废弃', value: API_STATUS.deprecated },
  { label: '未知', value: API_STATUS.unknown }
]
