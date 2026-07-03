# API 文档

本目录覆盖对外公共 API 的设计、接入、运行治理和统计口径。新增或修改 `server/routes/v{N}/**` 下的公共接口时，先按下面顺序阅读。

## 推荐顺序

| 顺序 | 文档 | 解决的问题 |
| --- | --- | --- |
| 1 | [RESTful API 设计风格](./design-style.md) | URL、HTTP 方法、响应壳、状态码和版本控制如何统一 |
| 2 | [对外接口落地规范](./public-api-conventions.md) | route 文件如何组织、manifest 如何扫描、响应和计费如何落地 |
| 3 | [公共接口接入指南](./public-api-onboarding.md) | 从零新增接口或扩展现有接口的完整流程 |
| 4 | [API 调用统计规范](./call-statistics.md) | 调用日志、日聚合统计、API Key 调用次数的统计口径 |

## 维护边界

- `design-style.md` 只描述公开契约风格，不写项目实现细节。
- `public-api-conventions.md` 只描述项目落地约束，不重复完整流程。
- `public-api-onboarding.md` 负责串联流程和样板，允许保留 walkthrough。
- `call-statistics.md` 只定义统计口径；扣费细节链接到 [API 计费规则](../platform/billing-rules.md)。
