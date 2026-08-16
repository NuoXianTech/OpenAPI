import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'
import { MAOYAN_REALTIME_TYPES } from '~~/server/lib/maoyan'

export const MAOYAN_CAPABILITY_KEY = {
  enabledRankings: 'enabledRankings'
} as const

const RANKING_LABELS = {
  movie: '电影实时票房',
  tv: '电视收视榜',
  web: '网络剧热度榜',
  globalMovie: '全球电影票房'
} as const

const rankingValues: Array<keyof typeof RANKING_LABELS> = [...MAOYAN_REALTIME_TYPES, 'globalMovie']

export const apiCapabilityDefinition = defineApiCapabilities({
  title: '猫眼榜单能力',
  description: '控制猫眼接口允许查询的榜单类型。',
  fields: [
    {
      key: MAOYAN_CAPABILITY_KEY.enabledRankings,
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '可用榜单',
      description: '关闭后，对应榜单接口会返回能力已禁用。',
      defaultValue: rankingValues,
      options: rankingValues.map(value => ({ value, label: RANKING_LABELS[value] }))
    }
  ]
})
