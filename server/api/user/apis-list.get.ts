import { apiRegistryService } from '~~/server/services/api-registry-service'
import { defineAuthenticatedEventHandler } from '~~/server/utils/auth'

/**
 * 用户侧 · 获取所有"已启用且非 orphan"的接口，用于 API Key 创建/编辑表单
 * 的"接口范围"下拉选项。
 *
 * 不再用 status=1 过滤：status 反映运行状态（维护/废弃/未知），那些状态下用户
 * 仍可能需要把接口加入 scope，调用时由 gate/manifest 给出对应错误即可。
 * orphan 接口（源文件已被物理删除）自动被 isEnabled=false 排除。
 *
 * 返回字段：
 *   - scope：写入 apiKeys.scopes 的字符串，格式 `${pathVersion}.${code}`
 *   - 其它字段仅用于前端展示分组
 */
export default defineAuthenticatedEventHandler(async () => {
  return apiRegistryService.listEnabledScopeOptions()
})
