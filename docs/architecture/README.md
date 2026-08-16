# OpenAPI 架构文档

OpenAPI 由两个独立应用组成：

```text
openapi-platform   Nuxt/Nitro 管理平台与 API Gateway
openapi-service    Node.js/Hono 业务 API 服务
```

Platform 管理公开路由、访问控制、积分、统计和运营数据；Service 实现具体业务接口。两者通过 HTTP、OpenAPI、Service Token 和业务配置协议协作，不共享数据库，也不要求同步发布。

## 文档目录

- [系统概览](system-overview.md)：产品定位、部署单元、职责边界与核心约束。
- [Platform 架构](platform.md)：管理模型、动态 Gateway、Routing Revision、治理与 Service 控制面。
- [Service 架构](service.md)：Hono 服务结构、业务模块、OpenAPI、配置与工程边界。
- [领域模型](domain-model.md)：Workspace、Product、Route、Upstream、Revision、调用与计费数据。
- [运行时协议](runtime-protocols.md)：公开请求、Service 发现、配置同步、Header、错误与追踪语义。
- [部署模型](deployment.md)：构建、镜像、网络、升级、回滚与可用性边界。
- [版本与支持范围](release-scope.md)：版本语义、受支持能力、兼容规则、正式发布门禁与非目标。

## 事实来源

文档描述稳定契约；出现差异时按以下顺序核对：

1. 数据库 Schema、Zod Schema 和公开 OpenAPI。
2. Gateway、Service 控制面与业务 Route 的自动化测试。
3. 本目录中的架构声明。
4. 开发和运维指南中的操作示例。

具体官方接口的请求与响应契约由 `openapi-service/docs/apis/` 维护，Platform 文档不复制业务接口实现细节。
