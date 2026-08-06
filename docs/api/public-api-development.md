# 新增公共接口开发指南

本文面向 OpenAPI 项目维护者，目标只有一个：把一个新增或扩展的公共接口，从代码实现推进到首次真实调用成功。

公共接口指 `server/routes/v{N}/<code>/**` 下，由 [API manifest](../../modules/api-manifest.ts) 扫描并由 [`defineOpenApiEventHandler`](../../server/utils/api-guard.ts) 统一治理的路由。后台内部接口（`server/api/admin/**`、`server/api/user/**`）不在本文范围内。

本文不重复稳定规则。开始前按需查阅：

- [RESTful API 设计风格](./design-style.md)：路径、HTTP 方法、状态码和版本。
- [对外接口落地规范](./public-api-conventions.md)：目录约定、响应壳、入参校验、计费和后台配置。
- [公共接口业务能力声明规范](./public-api-capabilities.md)：需要管理员控制业务参数或密钥时使用。

## 1. 先判断改动类型

| 改动类型 | 适用场景 | 注册与配置 |
| --- | --- | --- |
| 扩展已有接口组 | 在现有 `/v1/<code>` 下增加 endpoint 或子能力 | 复用已有 `(pathVersion, code)` 注册行 |
| 新增接口组 | 新建 `/v1/<new-code>` 能力域 | 重启后由 manifest 自动创建注册行，再到后台启用 |

这个判断只决定路由归属和后台注册行，不强制业务层采用某种架构。默认从简单的 `server/lib/<code>/` 模块开始；只有出现动态发现、可插拔子项或本地数据集等真实需求时，再引入 registry 或 repository。

## 2. 六步完成接入

### 2.1 设计公开契约

先确定路径、method、参数、成功结果和失败状态，再写代码。

- 第一层 `<code>` 使用稳定、静态的小写连字符名称。
- 资源路径和 HTTP method 遵循 [RESTful API 设计风格](./design-style.md)。
- 需要破坏现有调用方式时，新增版本目录，不直接修改旧版本契约。

### 2.2 实现业务逻辑

业务逻辑放在 `server/lib/<code>/`，route handler 只负责读取请求、调用业务函数和返回响应。

业务层应尽量满足：

- 不依赖 `H3Event` 或 HTTP 响应对象。
- 上游请求、格式转换和业务错误分层清楚。
- 纯函数和边界逻辑可以单独测试。
- 共享状态、缓存或注册表有明确的生命周期。

### 2.3 添加或调整路由

新增接口组时，最小目录形态如下：

```text
server/routes/
└── v1/
    └── foo/
        └── index.get.ts    → GET /v1/foo
```

路由层只保留三条硬规则：

1. `<code>` 必须是静态目录名，并与后台注册编码一致。
2. 文件名后缀表达 method，例如 `index.get.ts`、`[id].post.ts`。
3. handler 使用 `defineOpenApiEventHandler`，成功和失败返回统一公共接口响应。

`defineOpenApiEventHandler` 的 handler 第二个参数提供当前请求的内置上下文，适合直接接入新接口：

```ts
import type { H3Event } from 'h3'

export default defineOpenApiEventHandler(async (event: H3Event, api) => {
  const keyword = String(api.query.keyword || '').trim()
  if (!keyword) return api.fail(400, 'MISSING_KEYWORD', 'keyword 不能为空')

  try {
    const data = await search(keyword, api.signal)
    return api.respond(data, {
      message: '查询成功',
      text: value => `结果：${JSON.stringify(value)}`,
      markdown: value => `# 查询结果\n\n\`${JSON.stringify(value)}\``
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败'
    return api.businessFail(502, 'UPSTREAM_ERROR', message)
  }
})
```

上下文包含：

- `signal`：由平台超时治理控制的 `AbortSignal`。
- `url` / `header(name)`：当前请求 URL 和请求头读取能力。
- `setHeaders(headers)`：设置缓存、CORS、Retry-After 等响应头。
- `query` / `params`：已解析的查询参数和动态路由参数。
- `clientIp` / `apiKey` / `requestId`：可信客户端 IP、已通过鉴权的 Key 元数据和请求追踪 ID；不会暴露原始密钥。
- `readBody<T>(maxBytes?)`：按公共接口限制读取 JSON、文本或表单请求体；请求体解析仍由业务模块负责。
- `ok` / `fail` / `businessFail`：统一响应壳；`businessFail` 同时写入调用日志并跳过扣费。
- `respond`：默认返回标准 JSON；当 `encode` 或 `encoding` 为 `text`、`markdown` 或 `md` 时，调用对应格式化函数并统一设置内容类型。
- `raw` / `redirect`：内容协商接口的直出响应和重定向，自动补齐 `Content-Type` 与 `X-Request-Id`。

`event` 仍然保留给少数需要使用 H3 特有能力的场景。业务抓取、解析和缓存继续放在 `server/lib/<code>/`，不要把业务逻辑塞进上下文。

如果某个 HTTP 状态码只是业务结果说明，不应影响成功率、失败率或自动可用率，可以在 handler 后声明：

```ts
export default defineOpenApiEventHandler(handleRequest, {
  ignoreStatisticsStatusCodes: [422]
})
```

这些响应仍会保留调用日志、真实状态码和错误信息，但不会进入日聚合统计；该选项不改变扣费规则。只声明确实不代表服务故障的状态码，网关拒绝和未进入 handler 的请求不受此选项影响。

响应与校验工具按场景选择：

| 场景 | 使用 |
| --- | --- |
| 成功 | `openApiOk` |
| 参数或协议失败 | `openApiFail` |
| 需要记录错误并跳过扣费的业务失败 | `openApiBizFail` |
| JSON / text / Markdown 内容协商 | `api.respond` |
| Zod body 校验 | `readOpenApiBody` |

详细约束和最小示例见 [对外接口落地规范](./public-api-conventions.md)。

### 2.4 按需声明业务能力

只有当管理员需要控制上游地址、业务开关、默认参数或敏感凭据时，才新增：

```text
server/api-capabilities/v1/<code>.ts
```

普通接口不要为了“以后可能需要”提前声明能力。定义方式、密钥存储和运行时读取见 [公共接口业务能力声明规范](./public-api-capabilities.md)。

### 2.5 重启并完成后台配置

新增或删除 route 文件后重启开发服务器，使 Nitro 路由表和 manifest 保持一致。新增接口组会自动生成默认禁用的注册行。

进入“管理后台 → 接口管理”，至少核对：

- 名称、分类、简介和接口文档地址。
- `isEnabled`：确认配置完成后再启用。
- `isApiKey`：是否要求 `x-api-key`。
- `isStatistics`：是否记录调用日志并参与统计。
- `methodCosts`：各 HTTP method 的调用费用。
- `rateLimit*`、`dailyQuota` 和 `timeoutMs`：限流、配额与超时。

任意 method 收费时必须启用 API Key，否则无法确定扣费账户。

### 2.6 调用真实路径验证

不要只验证业务函数。必须调用真实 `/v{N}/<code>` 路径，让 gate、manifest 和 handler 一起经过验证。

```bash
# 免鉴权接口
curl -i 'http://127.0.0.1:3000/v1/foo'

# 需要 API Key 的接口
curl -i 'http://127.0.0.1:3000/v1/foo' \
  -H 'x-api-key: <your-api-key>'
```

成功响应应使用统一的 `{ code, message, data, timestamp }` 结构；内容协商型接口的原始文本响应除外。

## 3. 特殊实现模式

以下模式是按需工具，不是新增接口的必选模板。

### 3.1 普通业务模块（默认）

多数接口只需要按职责拆分函数或服务模块。可以参考：

- [exchange-rate](../../server/lib/exchange-rate/)：小型计算与数据转换。
- [bing](../../server/lib/bing/)：上游请求与结果转换。
- [doubao](../../server/lib/doubao/)：多种能力共享 HTTP 与配置层。

先选择这种简单结构，出现明确扩展压力后再增加抽象。

### 3.2 注册中心（可插拔子项）

只有接口需要按名称动态列举、查找和执行多个同类子项时，才使用 registry。现有样板是 [crypto](../../server/lib/crypto/)。

扩展现有 crypto 算法时：

- 子项名称保持唯一并使用小写连字符。
- 注册表等进程级单例放在 `server/lib/`，不要放进自动导入目录。
- 按现有 `index.ts` 同时导入具名 export 并更新 anchor，避免生产构建时副作用模块被 tree-shake。

### 3.3 本地数据仓库

接口需要按需加载只读数据集时，可以参考 [yiyan](../../server/lib/yiyan/)。

- dynamic import 使用字面量路径，确保构建工具能够追踪数据文件。
- 加载后可以使用进程级只读缓存，避免重复 IO。
- 多格式、字符集或 JSONP 输出属于特殊需求，普通接口只返回标准 JSON 响应。

## 4. 常见失败定位

| 结果 | 常见原因 | 处理方式 |
| --- | --- | --- |
| `403 API_NOT_REGISTERED` | 未重启，或 route 不符合 manifest 目录约定 | 重启 dev，检查版本与 `<code>` 目录 |
| `503 API_DISABLED` | 注册行已创建但尚未启用 | 在管理后台完成配置并启用 |
| `405 METHOD_NOT_ALLOWED` | 请求 method 与文件名后缀不一致 | 检查 route 文件名和 `Allow` 响应头 |
| `401 MISSING_API_KEY` / `INVALID_API_KEY` | 接口要求密钥，但请求未携带有效密钥 | 创建并传入 `x-api-key` |
| `429 RATE_LIMITED` / `QUOTA_EXCEEDED` | 命中限流或每日配额 | 检查后台治理配置与调用频率 |
| `2xx` 但响应不是统一结构 | handler 裸返回，或误用了内部 API 工具 | 改用公共接口响应工具 |

## 5. PR 自查

- [ ] 路径、method、状态码和版本符合公开契约。
- [ ] 业务逻辑位于 `server/lib/<code>/`，handler 保持薄。
- [ ] `<code>` 是静态目录名，route 文件名与 method 一致。
- [ ] 成功、协议失败和业务失败使用了正确的响应工具。
- [ ] 只有真实需要管理员配置时才声明业务能力。
- [ ] 新接口已同步注册，并配置鉴权、计费、统计、限流和配额。
- [ ] 已调用真实路径验证成功、失败和鉴权分支。
- [ ] 已补充或更新对应接口文档，并通过相关质量检查。

## 相关文档

- [RESTful API 设计风格](./design-style.md)
- [对外接口落地规范](./public-api-conventions.md)
- [公共接口业务能力声明规范](./public-api-capabilities.md)
- [调用统计规范](./call-statistics.md)
