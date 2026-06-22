# 项目文档

本文档目录按主题分区维护。新增文档优先放入对应子目录，文件名统一使用小写短横线；只有跨主题导航保留在本文件。

## API

| 文档 | 用途 |
| --- | --- |
| [RESTful API 设计风格](./api/style.md) | URL、HTTP 方法、响应壳、状态码、版本控制等接口设计约定 |
| [对外接口落地规范](./api/conventions.md) | `server/routes/v{N}/**` 的目录、构建约束、响应工具、计费标记与后台注册 |
| [公共接口接入指南](./api/onboarding.md) | 从零接入或扩展一个公共 API 的完整流程 |
| [API 调用统计规范](./api/call-statistics.md) | 调用日志、日聚合统计、API Key 调用次数的口径 |

## 业务与平台

| 文档 | 用途 |
| --- | --- |
| [API 计费规则](./billing/charging.md) | 公开 API 的扣费链路、可靠性规则与已知限制 |
| [后台页面规范](./frontend/dashboard.md) | admin/user 后台页面骨架、组件选型、弹窗与目录约定 |

## 运维

| 文档 | 用途 |
| --- | --- |
| [VPS 部署指南](./deployment/vps.md) | 单 Node/Nitro 进程 + PostgreSQL 的构建、上传、启动与 PM2 建议 |
