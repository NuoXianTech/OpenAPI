# OpenAPI Platform 架构

## 1. 定位

`openapi-platform` 同时提供管理控制台、管理 API 和动态 API Gateway。它保存 API 管理与运营数据，但不实现具体业务接口。

技术栈：

- Nuxt 4、Vue 3、TypeScript、Nitro。
- Nuxt UI 4 与 Tailwind CSS。
- Drizzle ORM。
- PostgreSQL 或单进程 PGlite。
- Redis 用于共享限流、缓存和多实例协调。

## 2. 内部模块

```text
Nuxt application
├── Console UI
├── Auth and account APIs
├── API management APIs
├── Service control client
├── Routing revision service
├── Dynamic Gateway
├── Access governance
├── Credit settlement
├── Call logging and reporting
└── Operational settings and tasks
```

Console 与 Gateway 共用同一个 Nitro 应用和数据库连接，但在代码中保持明确的领域边界。Gateway 只消费已发布 Revision，不直接读取后台表单草稿来决定流量。

## 3. 管理模型

Platform 使用以下层级描述公开 API：

```text
Workspace
├── Environment
│   └── Active Routing Revision
├── API Product
│   └── API Version
│       └── Route
└── Upstream
    └── Target
```

- Workspace 是管理与发布边界。
- Environment 持有一个活动 Routing Revision。
- Product/Version 组织对外能力和版本生命周期。
- Route 定义公开 Method、Path、Upstream 映射和治理规则。
- Upstream 定义一个逻辑上游，Target 定义一个可请求实例。
- Routing Revision 是可审计、不可变、可回滚的完整运行快照。

## 4. 接口目录与 Routing Revision

`/admin/apis` 是日常接口发布入口。它不是新的持久化领域，也不复制一份发布状态，而是将 Service Endpoint、Route 期望配置和当前活动 Revision 投影为一个接口目录。

Internal Service 的标准流程是：

1. Service 发现更新 OpenAPI 文档和 Endpoint 摘要，但不直接公开接口。
2. 管理员在接口目录明确点击发布。
3. Platform 按 Upstream 自动创建或复用 Product 与 Version，并创建公开 Route；默认公开 Path 与 Service Path 相同。
4. 发布、停用以及 API Key、统计、积分、限流等治理变更保存后，Platform 自动应用运行配置；只有完整配置实际变化时才生成并激活新的 Routing Revision。
5. 高级设置仍可编辑 Host、公开 Path、Upstream 模板、超时和大小限制，但保存动作同样自动发布。

Revision 是 Gateway 的安全运行边界，不是管理员必须手工编排的日常步骤。生成 Revision 时 Platform：

1. 读取 Workspace 内可发布的完整配置。
2. 校验 Route 冲突、引用完整性和治理约束。
3. 生成规范化 JSON payload。
4. 计算 SHA-256 checksum。
5. 与当前活动 Revision 比较；配置相同则直接复用，不产生重复历史。
6. 配置变化时保存不可变 Routing Revision，并激活到指定 Environment。
7. 通知 Gateway 刷新运行时缓存。

Route 行保存期望状态，活动 Revision 保存实际流量状态。自动发布成功后两者一致并立即生效；如果冲突校验或引用校验失败，Route 期望状态仍会保留，活动 Revision 和现有流量保持不变，接口目录显示“待应用”或“待下线”并允许重试。

后台将该技术概念显示为“运行快照”。运行快照页面只用于审计和回滚；管理员可以重新激活历史 Revision，而不需要恢复旧 Route 行或重启进程。

## 5. 动态 Gateway

Gateway 按以下顺序处理公开请求：

1. 根据 Host、Method 和 Path 匹配活动 Route。
2. 解析调用方身份和客户端 IP。
3. 执行 API Key、Scope、IP、有效期和配额检查。
4. 执行 Route 限流。
5. 为付费调用创建积分预留。
6. 清理调用方认证头和内部保留头。
7. 选择 Upstream Target 并转发请求。
8. 根据响应结果结算或释放积分预留。
9. 写入 Route 调用明细、耗时和积分关联。

未命中活动 Route 时返回稳定的 `API_NOT_FOUND`，不会回退到 Platform 内部业务代码。

## 6. Route 匹配与转发

Route 支持：

- 精确 HTTP Method。
- 精确 Host 和通配 Host。
- 静态 Path。
- `{id}` 单段 Path 参数。
- `{path+}` 尾部通配参数。
- Upstream Path 模板。
- Query 和请求体转发。
- 流式响应转发。
- 请求超时、请求体和可缓冲响应体上限。

通用 Gateway 默认保留 Upstream 状态码、Content-Type 和响应体。Platform 只为自身产生的鉴权、限流、计费和路由错误使用平台错误契约。

## 7. Upstream

### 7.1 Internal Upstream

Internal Upstream 用于受信 API Service：

- Platform 为每个 Upstream 独立加密保存 Service Token。
- 调用时注入 `Authorization: Service <token>`。
- 删除调用方 `Authorization`、Cookie、API Key 和伪造内部头。
- 可发现 Service 身份、OpenAPI 和业务配置 Schema。
- 多个 Target 必须属于同一逻辑 Service 并暴露相同契约。

### 7.2 External Upstream

External Upstream 用于普通 HTTP API：

- 默认要求 HTTPS。
- 执行 DNS 与目标 IP 校验。
- 拒绝环回、链路本地、云元数据和未授权私网地址。
- 不要求实现 Service 发现或配置协议。

### 7.3 Target 选择

一个 Upstream 可以包含多个启用 Target。当前策略包括轮询和加权轮询。流量选择与配置同步相互独立：业务请求只选择一个 Target，而业务配置总是下发到全部启用 Target。

## 8. Service 控制面

管理员在 Internal Upstream 页面执行 Service 发现。Platform 会：

1. 读取 Service 描述。
2. 校验 Service ID、协议版本和契约指纹。
3. 保存确定性 OpenAPI 文档及 Endpoint 摘要。
4. 读取业务配置 Schema 和脱敏状态。
5. 为通用字段生成管理表单。

业务配置保存后，Platform 使用乐观锁生成更高 Revision，分别向全部启用 Target 下发同一完整快照，并记录 `synced`、`drifted`、`error` 或 `unknown` 状态。部分 Target 失败不会被视为全部成功。

Secret 使用独立存储域加密。管理 API 只返回是否已配置，浏览器和普通日志永远不会收到明文。

## 9. 访问治理与积分

Route 可以声明：

- 是否要求 API Key。
- 可用 Scope。
- IP 白名单。
- 秒、分、时、日限流。
- 调用日志开关。
- 成功调用积分成本。

付费调用采用“预留—请求—结算”流程。只有成功结果扣除积分；验证失败、网络失败、超时和业务失败会释放预留。重复结算必须保持幂等，余额变化必须有可审计流水。

## 10. 数据与后台任务

Platform 持有：

- 用户、管理员、Session 和 OAuth 数据。
- API Key、Scope 和安全摘要。
- Workspace、Product、Route、Upstream 和 Revision。
- Service Token 与业务配置密文。
- 调用明细、积分预留与积分流水。
- 公告、通知、站点设置和审计日志。

后台任务负责过期 Session、日志清理、积分预留恢复、通知投递和运行时缓存协调。涉及余额或鉴权的关键任务在依赖不可用时必须 fail-closed。

## 11. 安全边界

- Platform 不接受管理员上传或执行任意业务代码。
- 所有 Secret 使用分域密钥加密，日志只记录配置状态。
- API Key 同时保存查询摘要和授权范围内可恢复密文，数据库不保存裸明文列。
- External Upstream 必须经过 SSRF 防护。
- Internal Upstream 不接收调用方认证凭据。
- 发布、回滚、Token 和 Secret 变更必须写入审计日志。
- PGlite 只支持单 Platform 进程；多实例必须使用 PostgreSQL 和共享 Redis。
