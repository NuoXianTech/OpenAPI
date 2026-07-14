import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'
import { ensureCryptoRegistered } from '~~/server/lib/crypto'
import { listAlgorithms } from '~~/server/lib/crypto/registry'

export const CRYPTO_CAPABILITY_KEY = {
  allowedAlgorithms: 'allowedAlgorithms'
} as const

ensureCryptoRegistered()
const algorithms = listAlgorithms()

export const apiCapabilityDefinition = defineApiCapabilities({
  title: '加密与解密能力',
  description: '控制公共接口允许用户调用的加密与解密算法。未配置时使用声明中的默认值。',
  fields: [
    {
      key: CRYPTO_CAPABILITY_KEY.allowedAlgorithms,
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '可用算法',
      description: '关闭后，算法不会出现在算法列表中，直接调用也会被拒绝。',
      defaultValue: algorithms.map(algorithm => algorithm.name),
      options: algorithms.map(algorithm => ({
        value: algorithm.name,
        label: algorithm.title,
        description: algorithm.description
      }))
    }
  ]
})
