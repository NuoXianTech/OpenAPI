import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'

export const IP_CAPABILITY_KEY = {
  databaseKey: 'databaseKey'
} as const

export const apiCapabilityDefinition = defineApiCapabilities({
  title: 'IP 归属地能力',
  description: '配置本地纯真 CZDB 数据库的查询密钥。数据库文件从独立的接口数据目录读取。',
  fields: [
    {
      key: IP_CAPABILITY_KEY.databaseKey,
      control: API_CAPABILITY_CONTROL.text,
      label: 'CZDB 数据库密钥',
      description: '填写下载 IPv4/IPv6 数据库时取得的配套 Base64 密钥。后台不会回显现有值，留空保存将保持原配置。',
      defaultValue: '',
      placeholder: '粘贴 CZDB 数据库密钥',
      maxLength: 24,
      isSecret: true
    }
  ]
})
