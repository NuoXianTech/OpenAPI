import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'
import { MUSIC_PLATFORMS } from '~~/server/lib/music/types'

export const MUSIC_CAPABILITY_KEY = {
  enabledPlatforms: 'enabledPlatforms',
  neteaseCookie: 'neteaseCookie',
  tencentCookie: 'tencentCookie',
  kugouCookie: 'kugouCookie',
  baiduCookie: 'baiduCookie',
  kuwoCookie: 'kuwoCookie'
} as const

const PLATFORM_LABELS: Record<(typeof MUSIC_PLATFORMS)[number], string> = {
  netease: '网易云音乐',
  tencent: 'QQ 音乐',
  kugou: '酷狗音乐',
  baidu: '千千音乐',
  kuwo: '酷我音乐'
}

const COOKIE_FIELDS = MUSIC_PLATFORMS.map(platform => ({
  key: MUSIC_CAPABILITY_KEY[`${platform}Cookie` as keyof typeof MUSIC_CAPABILITY_KEY],
  control: API_CAPABILITY_CONTROL.text,
  label: `${PLATFORM_LABELS[platform]} Cookie`,
  description: '用于会员或登录态资源请求。后台不会回显现有值，留空保存将保持原配置。',
  defaultValue: '',
  placeholder: '粘贴完整 Cookie 字符串',
  maxLength: 12_000,
  isSecret: true
} as const))

export const apiCapabilityDefinition = defineApiCapabilities({
  title: '音乐平台能力',
  description: '控制音乐接口允许调用的平台。',
  fields: [
    {
      key: MUSIC_CAPABILITY_KEY.enabledPlatforms,
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '可用音乐平台',
      description: '关闭后，该平台不会出现在平台列表中，相关查询也会被拒绝。',
      defaultValue: [...MUSIC_PLATFORMS],
      options: MUSIC_PLATFORMS.map(platform => ({ value: platform, label: PLATFORM_LABELS[platform] }))
    },
    ...COOKIE_FIELDS
  ]
})
