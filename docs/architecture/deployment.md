# 部署模型

## 1. 部署单元

生产环境包含两个独立应用：

| 应用 | 运行时 | 默认职责 |
| --- | --- | --- |
| `openapi-platform` | Node.js + Nuxt/Nitro | Console、管理 API、Gateway、治理与运营 |
| `openapi-service` | Node.js + Hono | 官方业务 Endpoint 与业务配置 |

它们可以运行在同一台服务器，也可以部署到不同服务器。统一使用 Node.js 便于维护，但不意味着合并进程、镜像或发布周期。

## 2. 推荐拓扑

```text
Internet
   |
Reverse proxy / TLS
   |
openapi-platform
   | private network
   +--> openapi-service target A
   +--> openapi-service target B
   |
   +--> PostgreSQL
   +--> Redis
```

Service 默认只在私网监听，不直接接受公网调用。Platform 是公开 API 的唯一入口。

## 3. 构建边界

所有构建在开发机或 CI 完成：

- Platform：安装依赖、lint、typecheck、测试、Nuxt build、镜像构建。
- Service：安装依赖、许可证检查、typecheck、测试、TypeScript build、镜像构建。

生产服务器只拉取并运行预构建产物，不执行：

- `pnpm install`
- `pnpm build`
- `docker build`
- Nuxt/Vite 构建

Platform 的 Nuxt 构建资源消耗不会影响 Service 更新窗口。

## 4. 配置边界

### Platform 部署配置

- `NUXT_AUTH_SECRET`
- `NUXT_API_KEY_SECRET`
- PostgreSQL 或 PGlite 配置
- Redis 配置
- 监听地址、可信代理和邮件/OAuth 等系统变量

### Service 部署配置

- `API_SERVICE_TOKEN` 与轮换 Token
- `SERVICE_ID`、名称、版本和 Commit
- 监听地址
- 配置快照文件
- 业务数据目录
- 来源网络、超时、并发和资源限制

### Service 业务配置

模块开关、来源凭据、Cookie、数据库授权密钥和算法允许列表由 Service Schema 声明，在 Platform 中加密保存和热更新，不作为 Platform 环境变量。

## 5. 数据库选择

### PostgreSQL

适用于常规生产、多 Platform 实例、成熟备份和独立数据库运维。

### PGlite

适用于单 Platform 进程的轻量部署：

- 数据目录必须持久化。
- 同一目录只能由一个 Node 进程访问。
- 不适用于多实例共享数据库。

Service 不连接以上数据库。

## 6. Redis

Redis 用于共享限流、短缓存、后台任务协调和多实例运行时通知。单实例可以使用内存回退；多实例生产必须配置共享 Redis，并对关键协调操作启用 fail-closed 策略。

## 7. 健康检查

Platform：

```text
GET /api/health
GET /api/ready
```

Service：

```text
GET /healthz
GET /readyz
```

Liveness 只表示进程存活；Readiness 应覆盖继续接收流量所需的关键依赖。Service 的业务数据缺失可以让相关模块返回稳定 `503`，不应让无关模块和 Platform 管理后台一起退出。

## 8. 升级与维护

### Platform 更新

1. 在 CI 构建并验证 Platform 镜像。
2. 备份数据库并确认迁移策略。
3. 滚动替换 Platform。
4. 验证登录、管理 API、活动 Revision 和公开 Route。

### Service 更新

1. 在 CI 构建并验证 Service 镜像。
2. 先替换一个 Target。
3. 验证健康、OpenAPI 和配置 Schema。
4. 在 Platform 重新执行 Service 发现。
5. 完成其余 Target 的滚动替换。

Service 更新不要求停止 Platform。Service 不可用期间，Console、管理 API 和 External Route 仍可继续工作。

## 9. 回滚

- Platform 应用回滚：恢复上一镜像。
- 路由回滚：激活上一 Routing Revision。
- Service 回滚：恢复上一 Service 镜像 digest。
- Service 配置恢复：由 Platform 重新同步已保存的期望 Revision。
- 数据库回滚：按发布前备份和迁移策略执行，不能通过回滚应用镜像隐式完成。

Platform 与 Service 的回滚互不要求同步。

## 10. 多 Target

同一 Internal Upstream 可以连接部署在不同服务器上的多个 Service Target：

- 轮询适用于容量相近的实例。
- 加权轮询按实例容量分配流量。
- 所有 Target 必须暴露相同 Service 身份和契约。
- 配置更新发送到全部启用 Target。
- 单个 Target 故障必须显示为部分失败或漂移。

不同业务 Service 或不同契约版本应建立独立 Upstream，不能放入同一个 Target 集合。

## 11. Secret 与网络

- Platform 和 Service 使用独立随机运行时密钥。
- Service Token 按 Internal Upstream 保存，不使用全局 Platform Token。
- 单机或 Compose 部署使用私有网络。
- 跨不可信网络必须使用 TLS；高安全环境可以增加 mTLS。
- 镜像、日志、错误、OpenAPI 和配置 Schema 不得包含 Secret。
- 容器使用非 root 用户，并对数据卷设置最小权限。
