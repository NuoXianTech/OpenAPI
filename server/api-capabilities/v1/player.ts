import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'

export const PLAYER_CAPABILITY_KEY = {
  enabledEngines: 'enabledEngines'
} as const

export const apiCapabilityDefinition = defineApiCapabilities({
  title: '播放器引擎能力',
  description: '控制播放器接口允许生成的播放器类型。',
  fields: [
    {
      key: PLAYER_CAPABILITY_KEY.enabledEngines,
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '可用播放器引擎',
      description: '关闭后，对应播放器生成接口会返回能力已禁用。',
      defaultValue: ['dplayer', 'artplayer'],
      options: [
        { value: 'dplayer', label: 'DPlayer' },
        { value: 'artplayer', label: 'ArtPlayer' }
      ]
    }
  ]
})
