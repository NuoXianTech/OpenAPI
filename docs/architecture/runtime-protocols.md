# Platform 与 Service 运行时协议

## 1. 协议范围

Platform 与 Internal API Service 只通过 HTTP 协作。协议包含：

- 公开业务请求代理。
- Service 身份与 OpenAPI 发现。
- 业务配置 Schema、状态与更新。
- Service Token 认证。
- Request ID、Trace Context 和 Route 身份传递。

Service 不读取 Platform 数据库，Platform 不调用 Service 源码模块。

## 2. Service 系统端点

```text
GET /healthz
GET /readyz
GET /openapi.json
GET /.well-known/service.json
GET /.well-known/configuration-schema.json
GET /.well-known/configuration.json
PUT /.well-known/configuration.json
```

`/healthz` 与 `/readyz` 可在受控内部网络免 Token 访问。其余端点要求：

```http
Authorization: Service <token>
```

失败返回 `401`，不得说明 Token 是否存在、长度是否正确或命中了轮换 Token。

## 3. Service 描述

`GET /.well-known/service.json` 返回稳定 Service 身份和协议入口，至少包含：

```json
{
  "serviceId": "openapi-service",
  "name": "OpenAPI Service",
  "version": "<semver>",
  "commit": "...",
  "platformProtocol": "openapi-platform-service/v1",
  "openapi": "/openapi.json",
  "openapiSha256": "...",
  "health": "/healthz",
  "readiness": "/readyz",
  "configuration": {
    "schema": "/.well-known/configuration-schema.json",
    "state": "/.well-known/configuration.json",
    "update": "/.well-known/configuration.json",
    "schemaSha256": "..."
  }
}
```

同一 Internal Upstream 的全部 Target 必须返回相同 `serviceId`、OpenAPI 指纹、配置 Schema 指纹和控制端点。

## 4. OpenAPI 发现

`GET /openapi.json` 返回确定性 OpenAPI 3.1 文档，并提供：

```http
ETag: "<document-sha256>"
X-OpenAPI-SHA256: <document-sha256>
```

Platform 重新计算内容哈希并与 Service 描述和响应头比对。发现成功后保存文档和 Endpoint 摘要，并将业务 Endpoint 展示在接口目录；发现动作本身不会创建公开 Route。

OpenAPI 指纹变化表示 Service 契约变化。新增 Endpoint 显示为“可发布”，缺失 Endpoint 会提示管理员处理；现有公开 Route 不会被静默改写。管理员确认发布、停用或治理变更后，Platform 自动生成新的 Routing Revision。

## 5. 业务配置协议

### 5.1 Schema

`GET /.well-known/configuration-schema.json` 返回字段分组、类型、默认值、约束、选项和说明。当前协议支持：

- boolean
- text
- textarea
- secret
- number
- single-select
- multi-select

Platform 只理解通用字段类型，不包含模块专用表单逻辑。

### 5.2 状态

`GET /.well-known/configuration.json` 返回：

- `schemaVersion`
- `serviceId`
- `schemaSha256`
- 当前 `revision`
- `configurationSha256`
- 脱敏 `values`
- `updatedAt`

Secret 只能返回：

```json
{ "configured": true }
```

### 5.3 更新

`PUT /.well-known/configuration.json` 接收完整期望快照：

```json
{
  "schemaVersion": 1,
  "revision": 7,
  "values": {
    "module.enabled": true,
    "module.secret": "plaintext-only-in-this-request"
  }
}
```

规则：

- Revision 必须为正安全整数。
- 小于当前 Revision 的请求返回冲突。
- 相同 Revision 与相同指纹返回幂等 ACK。
- 相同 Revision 与不同内容返回冲突。
- 未声明字段和非法值返回验证错误。
- Service 先持久化加密快照，再返回成功 ACK。

Platform 向同一 Upstream 的全部启用 Target 下发相同 Revision 和快照，分别记录结果。部分失败保留期望状态，并允许之后重新同步。

## 6. 公开请求转发

Platform 发送给 Internal Service 的请求保留业务 Method、Query、Body 和安全 Header，同时添加：

```http
Authorization: Service <token>
X-Request-Id: <request-id>
X-OpenAPI-Route-Id: <route-uuid>
X-Forwarded-For: <resolved-client-ip>
X-Forwarded-Proto: <http-or-https>
```

Platform 必须删除：

- 调用方 `Authorization`。
- Cookie 和代理认证头。
- `X-API-Key` 等公开 API Key Header。
- Query 中用于 Platform 鉴权的 `apikey`。
- 调用方伪造的 `x-openapi-*` 内部 Header。
- Hop-by-hop Header。

Service 只信任 Platform 重新生成的内部 Header。

## 7. 响应语义

Upstream 响应默认保持原状态码、Content-Type 和响应体。Platform 产生的治理错误使用稳定平台错误码；Service 产生的业务错误由 Service 契约定义。

计费结果按状态分类：

- 鉴权、Scope、限流和余额不足：不进入 Upstream，不扣费。
- 网络错误、超时和 Service 失败：释放积分预留。
- 成功结果：结算积分并记录调用。

响应已经开始流式发送后，不得再次修改状态码或重复计费。

## 8. CORS 与预检

动态 Route 的 `OPTIONS` 预检在 API Key、积分和 Upstream 调用前处理。成功预检返回 `204`，不写业务调用明细，也不消耗积分。

播放器资产等浏览器子资源 Route 应按实际用途配置匿名访问和统计开关。

## 9. 超时、取消与重试

- Gateway 为每次 Upstream 请求创建 Deadline。
- 客户端断开时应取消 Upstream 请求。
- 默认不自动重试非幂等请求。
- 是否重试必须由明确 Route/Upstream 策略控制，并保证计费只执行一次。
- Service 来源客户端继续使用自己的更短超时和响应大小限制。

## 10. 追踪与日志

Platform 为每次公开请求生成或验证 Request ID，并贯穿调用明细、积分流水和 Service 日志。支持标准 Trace Context 时转发 `traceparent` 与 `tracestate`。

日志不得包含：

- API Key、Service Token、Cookie 和业务 Secret。
- 敏感 Query 的完整值。
- 第三方签名 URL。
- 未限制长度的上游响应正文。

## 11. 协议兼容性

`openapi-platform-service/v1` 是 Platform 与 Service 控制协议版本，不等同于软件版本或公开业务路径版本。

兼容变更可以增加可选字段；破坏性变更必须发布新的协议版本，并由 Platform 在发现阶段明确拒绝不支持的版本。
