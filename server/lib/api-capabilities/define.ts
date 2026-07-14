import type { ApiCapabilityDefinition } from '#shared/types/api-capability'

/**
 * 公共接口业务能力声明入口。
 *
 * 声明文件必须位于 server/api-capabilities/v{N}/<code>.ts，并以
 * `apiCapabilityDefinition` 具名导出。构建期模块会自动发现，不需要修改平台注册表。
 */
export function defineApiCapabilities(definition: ApiCapabilityDefinition): ApiCapabilityDefinition {
  return definition
}
