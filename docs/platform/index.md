# 平台能力文档

本目录维护积分、计费、账号与平台级运行规则。它描述跨 API、前端和运维边界的业务能力。

## 文档索引

| 文档 | 用途 |
| --- | --- |
| [API 计费规则](./billing-rules.md) | 公开 API 的扣费链路、可靠性规则、限流模型与已知限制 |
| [生产就绪清单](../operations/production-readiness.md) | 发布计费、积分、鉴权和数据库变更前的生产核验 |

## 维护边界

- 平台能力文档只描述跨模块规则，不写单个 route handler 的实现细节。
- 与公共 API 接入相关的实现约束链接到 [API 文档](../api/index.md)。
- 与部署模型相关的内容链接到 [运维部署文档](../operations/index.md)。
- 与代码结构、SSR 和 TypeScript 相关的通用要求链接到 [工程标准](../standards/index.md)。
