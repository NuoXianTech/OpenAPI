# 公共接口能力配置

当公共接口需要由管理平台控制业务行为时，接口作者只负责声明能力和读取配置。平台负责发现声明、校验数据、持久化、并发控制与后台表单。

## 约定

```text
server/routes/v1/crypto/              公共接口实现
server/api-capabilities/v1/crypto.ts  同名能力声明
server/lib/crypto/capability-config.ts 业务语义适配（可选）
```

- 声明文件路径决定接口身份，不重复填写版本和 code。
- 仅声明需要管理员修改的业务能力；启停、鉴权、限流、计费等通用治理继续使用 `apis` 原有字段。
- 声明是代码真相，配置值存入 PostgreSQL `apis.capability_config`。
- 未配置时使用声明默认值；保存采用 revision 乐观锁，避免管理员互相覆盖。
- 配置读取使用共享缓存，保存后主动失效，适用于多实例部署。

## 声明能力

```ts [server/api-capabilities/v1/example.ts]
import { API_CAPABILITY_CONTROL } from '#shared/types/api-capability'
import { defineApiCapabilities } from '~~/server/lib/api-capabilities/define'

export const apiCapabilityDefinition = defineApiCapabilities({
  title: '示例接口能力',
  description: '控制示例接口对外提供的业务功能。',
  fields: [
    {
      key: 'isPreviewEnabled',
      control: API_CAPABILITY_CONTROL.boolean,
      label: '预览功能',
      description: '关闭后拒绝预览请求。',
      defaultValue: false
    },
    {
      key: 'enabledProviders',
      control: API_CAPABILITY_CONTROL.multiSelect,
      label: '可用供应商',
      description: '仅允许调用已启用的供应商。',
      defaultValue: ['primary'],
      options: [
        { value: 'primary', label: '主供应商' },
        { value: 'backup', label: '备用供应商' }
      ]
    }
  ]
})
```

当前支持：

- `boolean`：单个布尔开关。
- `single-select`：使用单选框选择一个固定选项。
- `multi-select`：使用多选框选择多个固定选项。
- `text`：单行文本，可声明 `placeholder`、`minLength`、`maxLength`。
- `textarea`：多行文本，在文本约束外还可声明 `rows`。
- `number`：数字输入，可声明 `min`、`max`、`step` 和 `placeholder`。

例如：

```ts
{
  key: 'notice',
  control: API_CAPABILITY_CONTROL.textarea,
  label: '接口公告',
  description: '展示给接口调用方的说明。',
  defaultValue: '',
  maxLength: 500,
  rows: 5
},
{
  key: 'maxBatchSize',
  control: API_CAPABILITY_CONTROL.number,
  label: '最大批量数量',
  description: '限制单次请求允许处理的数据量。',
  defaultValue: 10,
  min: 1,
  max: 100,
  step: 1
}
```

构建期会自动扫描声明，并校验它是否存在对应的 `server/routes/v{N}/{code}` 公共接口。新增声明后无需维护注册表。

## 在服务端读取

```ts [server/lib/example/capability-config.ts]
import { loadApiCapabilityConfig } from '~~/server/lib/api-capabilities/config-service'

export async function getExampleCapabilities() {
  const { values } = await loadApiCapabilityConfig('v1', 'example')

  return {
    isPreviewEnabled: values.isPreviewEnabled === true,
    enabledProviders: new Set(
      Array.isArray(values.enabledProviders)
        ? values.enabledProviders.filter(value => typeof value === 'string')
        : []
    )
  }
}
```

路由只消费业务语义，不直接处理后台表单或数据库结构：

```ts [server/routes/v1/example/index.get.ts]
import { getExampleCapabilities } from '~~/server/lib/example/capability-config'
import { openApiOk } from '~~/server/utils/open-api-response'

export default defineOpenApiEventHandler(async (event) => {
  const capabilities = await getExampleCapabilities()
  return openApiOk(event, { isPreviewEnabled: capabilities.isPreviewEnabled })
})
```

## 管理流程

1. 创建公共接口路由与同名能力声明。
2. 启动或构建应用，manifest 自动识别声明。
3. 在“接口管理”登记接口。
4. 从行操作打开“接口配置”并保存。
5. 所有实例在缓存失效后读取相同配置。

## 已接入的公共接口

- `v1/crypto`：控制允许调用的加密与解密算法。
- `v1/music`：控制网易云、QQ、酷狗、千千、酷我等音乐平台，并配置各平台登录 Cookie。
- `v1/doubao`：分别控制图片解析来源与视频解析来源。
- `v1/maoyan`：控制电影、电视、网络剧和全球电影票房榜单。
- `v1/player`：控制 DPlayer 与 ArtPlayer 播放器引擎。

这些接口共用同一套声明、管理表单、持久化、revision、审计和故障保护机制，不包含接口专属管理页面。

标记为 `isSecret: true` 的文本字段使用密码输入框，管理接口不会回显已有值；留空保存会保留原配置。审计日志只记录字段名，不记录 Cookie 等敏感内容。

管理接口为：

- `GET /api/admin/apis/capabilities?pathVersion=v1&code=example`
- `PUT /api/admin/apis/capabilities`

它们仅供管理平台使用，并统一执行管理员鉴权、声明校验和 revision 冲突检查。

## 上线检查

- 已执行数据库迁移。
- 接口已登记且未处于 orphan 状态。
- 默认值在未配置场景下是安全的。
- 新增选项不会破坏旧配置；删除选项后旧值会在读取时自动剔除。
- 路由对被关闭能力返回稳定的业务错误码。
- `pnpm typecheck`、`pnpm test:run`、`pnpm build` 全部通过。
