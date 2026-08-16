import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'
import { IMAGE_SOURCE_LABELS, VIDEO_SOURCE_LABELS } from '~~/server/lib/doubao/types'

export const DOUBAO_CAPABILITY_KEY = {
  enabledImageSources: 'enabledImageSources',
  enabledVideoSources: 'enabledVideoSources'
} as const

function createSourceOptions(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }))
}

export const apiCapabilityDefinition = defineApiCapabilities({
  title: '媒体解析来源能力',
  description: '控制图片和视频解析接口允许处理的分享来源。',
  fields: [
    {
      key: DOUBAO_CAPABILITY_KEY.enabledImageSources,
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '图片解析来源',
      description: '关闭后，来自该平台的图片分享链接会被拒绝。',
      defaultValue: Object.keys(IMAGE_SOURCE_LABELS),
      options: createSourceOptions(IMAGE_SOURCE_LABELS)
    },
    {
      key: DOUBAO_CAPABILITY_KEY.enabledVideoSources,
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '视频解析来源',
      description: '关闭后，来自该平台的视频分享链接会被拒绝。',
      defaultValue: Object.keys(VIDEO_SOURCE_LABELS),
      options: createSourceOptions(VIDEO_SOURCE_LABELS)
    }
  ]
})
