# 新增公共接口开发指南

Platform v1 不承载具体公共接口代码。新增接口只有两种方式：

1. 把现有标准 HTTP API 作为手动管理的 Upstream 接入 Platform。
2. 在 `openapi-service` 或兼容 Service 控制协议的第三方 Service 中开发，再由 Platform 的接口目录发布。

两种方式都不允许在 `openapi-platform/server/routes/v1` 或 `server/lib/<business>` 增加业务 Handler。

## 1. 手动管理的 Upstream

已有第三方 HTTP API 时：

1. 在 `/admin/apis/upstreams` 创建 Upstream，不填写 Service Token。
2. 配置 Target；支持内网地址、容器名、HTTP 与 HTTPS，公网 HTTP 会被拒绝，Platform 始终执行地址安全校验。
3. 在接口目录点击“自定义接口”，设置公开路径、上游路径模板、API Key、积分、限流和统计。
4. 保存后 Platform 创建 Route；应用运行配置时生成新的 Routing Revision。

手动管理的 Upstream 不要求实现 Service 发现或配置协议，Platform 也不会管理其内部业务配置。

## 2. Service-managed API Service

需要开发或维护官方公共接口时：

1. 在 `openapi-service` 定义稳定输入、输出和错误码。
2. 使用 Hono + Zod/OpenAPI 实现 Endpoint，并在显式组合根注册。
3. 外部来源必须使用受控 Source Client，限制 Host、重定向、超时、取消和响应大小。
4. JSON 业务响应使用统一 `code/message/data/timestamp` 壳；文件、HTML、流和 well-known 协议文档按各自媒体类型返回。
5. 补单元、Fixture、HTTP 和 OpenAPI 契约测试。
6. 只构建并发布 API Service。
7. 在 Platform 创建 Upstream，填写 Target 和独立 Service Token；Token 存在即启用 Service 管理能力。
8. 执行“发现 Service”，查看 OpenAPI Endpoint 和配置 Schema。
9. 在接口目录审查 Endpoint 并保存发布变更。Platform 默认沿用 Service Path 作为公开 Path，自动创建或复用 Product、Version、Route；确认后应用全部变更并激活新的 Routing Revision。

Service OpenAPI 变化不会在未经确认时暴露新 Endpoint，也不会静默改写现有公开 Route。新增 Endpoint 会显示为“可发布”，管理员明确保存并应用后才生效。

## 3. 业务配置

模块开关、音乐 Cookie、IP 数据库密钥、Crypto 算法等字段在各自的 `src/modules/<module>/configuration.ts` 声明，并由 `src/modules/index.ts` 显式组合。Platform 只根据通用字段类型生成表单：

- boolean
- text / textarea
- secret
- number
- single-select / multi-select

Secret 会在 Platform 数据库和 Service 本地快照中分别加密，管理读取只返回是否已配置。新增配置字段只修改和发布 Service，不修改 Platform。

禁止运行时业务模块注册、目录扫描、Platform 业务专用字段和远程模块路径。

## 4. Route 治理

Platform Route 决定：

- 公开 Host、Path 和 Method。
- 上游路径模板和 Target 负载策略。
- API Key、Scope 和 IP 白名单。
- 限流、积分、统计、超时和响应大小。
- 发布、下线和历史 Revision 回滚。

这些变更保存后由 Platform 自动生成并激活 Routing Revision，不需要构建或重启 Platform。只有 Service 业务代码、OpenAPI 或配置 Schema 变化才需要构建 Service。

## 5. 删除接口

1. 先在 Platform 接口目录停用公开接口，再应用全部变更；Platform 会发布不再包含该 Route 的 Revision。
2. 确认活动 Revision 不再引用 Endpoint。
3. 从 Service 删除实现、Schema、资产和测试。
4. 发布 Service 并重新执行发现。

## 6. 参考

- [RESTful API 设计风格](design-style.md)
- [对外接口落地规范](public-api-conventions.md)
- [公共接口业务配置](public-api-capabilities.md)
- [Platform 与 Service 运行时协议](../architecture/runtime-protocols.md)
- [Platform 与 Service 集成测试](../operations/service-integration-testing.md)
