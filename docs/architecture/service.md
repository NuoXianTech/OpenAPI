# OpenAPI Service 架构

## 1. 定位

`openapi-service` 是官方业务 API 服务。它使用 Node.js 24、TypeScript、Hono 和 Zod/OpenAPI，拥有独立进程、镜像、版本和回滚边界。

Service 负责具体业务 Endpoint、业务数据、第三方来源访问、业务配置、OpenAPI、健康检查和内部访问日志。它不管理 Platform 用户、公开 API Key、积分、公开路径或 Routing Revision。

## 2. 请求管线

```text
Node HTTP Adapter
  -> Request ID / Trace Context
  -> Structured access log
  -> Service Token authentication
  -> Request size and deadline
  -> Zod/OpenAPI validation
  -> Business module
  -> Local data or controlled source client
  -> Stable response or error
```

除健康与就绪探针外，系统契约和业务 Endpoint 只接受受信 Platform 请求：

```http
Authorization: Service <token>
```

## 3. 代码结构

```text
src/
├── index.ts                 进程启动、信号和优雅退出
├── app.ts                   Hono 组合根
├── config/                  部署配置校验
├── configuration/           业务配置定义、快照和热更新
├── contracts/               Service 与 OpenAPI 契约
├── http/                    Middleware、系统 Route 和错误映射
├── modules/                 具体业务模块
├── runtime/                 就绪状态和运行期状态
└── shared/                  通用响应与 OpenAPI 工具
```

`src/app.ts` 是显式组合根。业务模块在构建时注册，不扫描目录、不下载代码，也不接受 Platform 提供的类名、文件路径或模块入口。

## 4. 业务模块

当前官方模块：

- `yiyan`：读取只读语料，提供 JSON、文本、Markdown、JavaScript/JSONP 和 GBK 输出。
- `player`：生成 DPlayer/ArtPlayer 页面并提供固定版本的同源浏览器资产。
- `ip`：读取本地挂载的 IPv4/IPv6 CZDB 数据库。

新增模块应包含自己的 Route、Schema、领域逻辑、来源客户端、Fixture、测试和接口文档。只有至少两个生产调用方共同使用的无业务语义能力才进入 `shared`，不得形成隐藏的业务注册系统。

## 5. HTTP 与 OpenAPI

系统 Endpoint：

```text
GET /healthz
GET /readyz
GET /openapi.json
GET /.well-known/service.json
GET /.well-known/configuration-schema.json
GET /.well-known/configuration.json
PUT /.well-known/configuration.json
```

Zod Schema 是请求校验、响应类型和 OpenAPI 的单一来源。OpenAPI 使用确定性排序并暴露 SHA-256 指纹与 ETag，便于 Platform 检测契约变化。

`/.well-known/service.json` 通过 `serviceProtocol: "openapi-service/v1"` 声明控制协议。它只用于 Platform 与 Service 的兼容校验；Service 软件版本和业务路径版本独立演进。业务接口发生破坏性变化时可以新增 `/v2` 并保留 `/v1` 迁移，不需要同步修改 Platform 软件版本或控制协议。

Service OpenAPI 变化不会在未经确认时创建或修改公开 Route。Platform 接口目录会展示契约差异；管理员明确发布 Endpoint 后，Platform 自动创建 Route 并通过 Routing Revision 生效。

## 6. 响应与错误

业务 JSON Endpoint 使用统一响应壳：

```json
{
  "code": "OK",
  "message": "请求成功",
  "data": null,
  "timestamp": 1785542400000
}
```

HTML、JavaScript、文本、图片或流式内容按实际 Content-Type 返回，不强行包裹 JSON。Service 控制协议返回稳定的机器契约，也不使用业务响应壳。

错误码必须稳定且可测试。未知异常只公开 `INTERNAL_ERROR`；日志不得包含 Token、Cookie、数据库密钥、完整签名 URL 或第三方响应正文。

## 7. 来源访问

外部数据源通过普通 Source Client 访问，并遵守：

- 明确 Host allowlist。
- DNS 与目标地址校验。
- 逐跳重定向限制。
- 请求超时和取消信号。
- 响应大小上限。
- 有界并发和等待队列。
- 日志脱敏。

业务模块必须把来源响应转换为稳定领域对象，不能将第三方不稳定结构直接暴露为公开契约。

## 8. 业务配置

需要配置的模块在自己的 `src/modules/<module>/configuration.ts` 声明字段，再由 `src/modules/index.ts` 显式组合。支持：

- `boolean`
- `text`
- `textarea`
- `secret`
- `number`
- `single-select`
- `multi-select`

配置采用完整快照、单调 Revision 和 SHA-256 ACK。Secret 的读取接口只返回是否已配置；Service 使用 AES-256-GCM 持久化本地快照。

监听地址、Service Token、数据目录、代理、证书和容器资源仍属于部署配置，不通过业务 Schema 管理。

## 9. 可观测性

Service 结构化日志至少包含：

- 时间、级别和 Service 身份。
- Request ID 与 Trace Context。
- Method、Path、状态码和耗时。
- 来源错误分类和超时阶段。

Service 不记录调用方 API Key 或积分信息。Platform 需要关联请求时使用 `X-Request-Id` 和 `X-OpenAPI-Route-Id`。

## 10. 测试与发布

每个模块至少覆盖：

- 成功和参数错误。
- 来源失败、超时、取消和响应异常。
- OpenAPI 契约。
- Secret 脱敏和配置热更新。
- 固定资产版本、Content-Type 与缓存头。

默认测试必须离线可重复。生产依赖许可证、TypeScript 类型检查、测试、构建和运行时预算检查属于 Service 发布门禁。

Service 只执行 TypeScript 服务端编译，不包含 Nuxt、Vue 或浏览器应用构建。生产服务器运行预构建镜像；更新 Service 不要求停止或重建 Platform。

## 11. 第三方扩展流程

第三方开发者可以基于仓库新增业务模块：

1. 实现 Route、Schema、领域逻辑和测试。
2. 在 `src/app.ts` 显式注册模块。
3. 需要热更新配置时扩展业务配置定义。
4. 发布自己的 Service 镜像。
5. 在自己的 Platform 中创建 Internal Upstream。
6. 执行 Service 发现，确认 OpenAPI 与配置 Schema。
7. 在接口目录审查 Endpoint 并点击发布；Platform 自动创建 Route 和 Routing Revision。

Platform 不需要为第三方模块增加专用代码。
