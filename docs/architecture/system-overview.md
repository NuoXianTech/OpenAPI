# 系统概览

## 1. 产品定位

OpenAPI Platform 是一个通用、自托管的 API 管理平台。管理员可以从 Service 接口目录直接发布公开 Endpoint，或为标准 HTTP Upstream 创建自定义 Route，并统一应用鉴权、限流、积分、调用日志和运营规则。

具体业务接口不在 Platform 中实现。官方业务能力由独立的 `openapi-service` 提供，第三方 HTTP 服务也可以作为 Upstream 接入。

## 2. 系统拓扑

```text
Administrator / API consumer
              |
              v
┌──────────────────────────────────────┐
│ openapi-platform                     │
│ Console + Admin API + Nitro Gateway  │
│ Route / Auth / Limit / Credit / Log  │
└──────────────────┬───────────────────┘
                   │ HTTP
          ┌────────┴────────┐
          v                 v
┌───────────────────┐  ┌────────────────────┐
│ openapi-service   │  │ External Upstream  │
│ Hono business API │  │ Standard HTTP API  │
└───────────────────┘  └────────────────────┘
```

数据库和 Redis 属于 Platform 基础设施。Service 不连接 Platform 数据库，也不读取用户、API Key、积分或 Routing Revision。

## 3. 职责矩阵

| 能力 | Platform | Service |
| --- | --- | --- |
| 管理后台与账号 | 是 | 否 |
| Workspace、Product、Route、Upstream | 是 | 否 |
| API Key、Scope、IP、限流 | 是 | 否 |
| 积分预留、结算与流水 | 是 | 否 |
| Routing Revision 与回滚 | 是 | 否 |
| 具体业务参数和响应 | 否 | 是 |
| 本地业务数据和第三方来源 | 否 | 是 |
| 业务 OpenAPI | 发现与保存 | 生成与发布 |
| 业务配置 Schema | 渲染、加密、下发 | 声明、校验、应用 |
| Service 进程和镜像生命周期 | 否 | 独立部署系统负责 |

## 4. 三类独立变更

### 4.1 路由与治理变更

公开路径、Method、Upstream、API Key、积分、限流、统计和启停属于 Platform 配置。接口目录保存变更后自动生成并激活 Routing Revision，不要求重新构建 Platform 或 Service。

### 4.2 Service 业务配置变更

模块开关、来源凭据、Cookie、数据库授权密钥、算法允许列表等由 Service Schema 声明。Platform 保存后向同一 Upstream 的全部 Target 下发，不要求重新构建。

### 4.3 代码与部署变更

接口实现、OpenAPI、配置 Schema 或依赖变化需要重新构建 Service。监听地址、数据目录、Service Token、网络和进程资源变化通常只需要滚动重启对应应用。

## 5. 核心约束

- Platform 运行时不包含任何具体公共接口 Handler。
- 所有公开业务流量必须命中活动 Routing Revision。
- Service 发现本身不会公开 Endpoint；管理员必须在接口目录明确发布，Platform 随后自动完成 Route 与 Revision。
- Internal Upstream 使用独立 Service Token，调用方凭据不会透传给 Service。
- Service 模块在源码中显式组合，不支持运行时加载任意代码或远程模块。
- Platform 与 Service 是两个独立进程、镜像和版本线。
- 生产服务器只运行预构建产物，不执行依赖安装或构建。

## 6. 官方 Service 当前能力

`openapi-service` 当前提供一言、播放器和 IP 归属地模块。具体契约以 Service OpenAPI 和 `openapi-service/docs/apis/` 为准；不存在于 Service OpenAPI 的能力不属于当前产品契约。
