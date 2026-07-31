# 生产运行手册

本手册用于 OpenAPI 上线后的日常运行、异常排查和恢复。默认部署模型为单个 Node/Nitro 进程；使用 PostgreSQL、共享 Redis 且启用强制 Redis 后可部署多个 Node 实例。

## 运行边界

| 项目 | 约束 |
| --- | --- |
| 应用进程 | 默认单实例；多实例必须使用 PostgreSQL、共享 Redis 和 `NUXT_REDIS_REQUIRED=true` |
| 数据库 | 单 PostgreSQL 实例，迁移由 Node/Nitro 启动插件在应用启动前自动执行 |
| 限流 | 配置 Redis 时使用共享原子计数；未配置或非强制故障时回退进程内计数 |
| 短缓存 | Redis 缓存公开 DTO 与 API 守卫配置；故障时回源数据库，不缓存用户私有或敏感配置 |
| 扣费重试 | 每个实例都有定时器，但同一时刻仅 Redis lease 持有者扫描 `pending_charges` |
| 代理 | 生产公网流量由 Nginx 或等价代理转发到 `127.0.0.1:<NITRO_PORT>` |

## 日常巡检

每日或发布后检查：

```bash
pm2 status openapi
pm2 logs openapi --lines 120
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:3000/api/catalog
```

数据库侧重点：

| 检查项 | 异常信号 |
| --- | --- |
| `pending_charges` | 持续增长、出现大量 `dead_letter` |
| `api_calls` | 失败率突然升高、某 API 调用量异常 |
| `api_call_stats` | 日聚合缺失或延迟明显 |
| `operation_logs` 中的 `auth.login.*` 事件 | 管理员登录失败集中爆发 |
| `operation_logs` | 敏感配置被频繁修改 |

## 日志定位

| 现象 | 优先查看 |
| --- | --- |
| 服务无法启动 | PM2 日志、`DATABASE_URL`、端口占用 |
| readiness 返回 503 | PostgreSQL 连接；强制 Redis 模式下同时检查 `NUXT_REDIS_URL`、认证和网络 |
| 面板提示 package.json 无 scripts | Nitro 产物直接运行 `node server/index.mjs`，不要把 `.output/server` 当源码项目 |
| SSR 提示缺少 `entities/decode` | 检查是否完整部署 `.output/server/node_modules/.nitro`；改用 Linux CI/Docker 构建 |
| 扣费扫描持续跳过 | Redis lease 可用性、`NUXT_REDIS_REQUIRED` 和 `[pending-charges]` 日志 |
| 启动迁移失败 | PM2 日志中的 `[db:migrate]`、`DATABASE_URL` 权限、`.output/server/db/migrations/postgresql` 是否完整 |
| 管理后台无法登录 | `NUXT_AUTH_SECRET`、管理员账号状态、统一登录页、登录日志 |
| API Key 全部失效 | `NUXT_API_KEY_SECRET` 是否与加密时一致、`api_keys.key_digest` 是否存在、Key 是否被禁用/吊销、网关是否连接了预期数据库 |
| 邮箱验证失败 | `NUXT_AUTH_SECRET`、SMTP 配置、邮件发送日志 |
| 公开 API 429 增多 | API 配置、Redis/进程内限流窗口、调用方 IP 或 Key |
| 数据库读取突增 | Redis 可用性、命令延迟、内存、淘汰数和公开缓存命中情况 |
| 扣费异常 | `api_calls`、`credit_transactions`、`pending_charges` |

## 备份策略

生产数据库至少保留每日备份。发布数据库迁移前必须手动创建一次备份或快照。

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

PGlite 部署不使用 `pg_dump`。先停止唯一的 Node 进程，再对整个 `PGLITE_DATA_DIR` 做一致性快照或归档；恢复时同样保持进程停止，并恢复到原权限与路径。不要在进程写入期间只复制其中单个文件。

备份文件应离开应用服务器保存，避免服务器磁盘故障时同时丢失应用和备份。Redis 只保存可重建缓存、限流计数和短期租约，不作为业务主数据备份来源。

## 恢复演练

恢复到临时数据库验证备份可用：

```bash
createdb openapi_restore_test
pg_restore --dbname=openapi_restore_test --clean --if-exists backup-YYYYMMDD-HHMMSS.dump
```

恢复生产前先停止应用进程，避免旧进程继续写入：

```bash
pm2 stop openapi
DB_AUTO_MIGRATE=false pg_restore --dbname="$DATABASE_URL" --clean --if-exists backup-YYYYMMDD-HHMMSS.dump
cd .output
pm2 restart openapi --update-env
```

如果迁移不可逆，优先回滚应用版本并评估数据修复脚本，不直接强行恢复旧库覆盖新业务数据。

## 安全巡检

| 项目 | 要求 |
| --- | --- |
| 管理员密码 | 管理员账号存储在 `users` 表，首次启动生成的随机密码只输出到控制台；首次登录后完成初始化弹窗并定期更新密码 |
| 运行时密钥 | 每个环境独立生成，泄露后立即轮换 |
| Nginx | 只开放必要端口，反向代理到本机 Nitro |
| 数据库 | 不暴露公网，账号只给应用所需权限 |
| API Key | 支持作用域、IP 白名单、配额、有效期和吊销 |
| 日志 | 不记录 API Key 明文、密码、验证码或完整 token |

## 异常处置

1. 先确认影响范围：首页、统一登录页、管理后台、用户后台、公开 API、数据库、邮件、第三方 OAuth。
2. 冻结变更：暂停发布、停止批量任务、保留日志。
3. 读取 PM2 日志和数据库关键表，定位最近一次配置或代码变更。
4. 如果影响公开 API 收费，检查 `pending_charges` 和 `credit_transactions` 是否需要人工补偿。
5. 能快速回滚应用时先回滚应用；涉及数据库结构时先备份当前状态。
6. 恢复后补充事件记录：时间线、根因、影响、修复、预防项。

## 性能观察

发布后关注：

- 首页和后台入口的 LCP、CLS、INP。
- 图表页和日志页的交互延迟。
- `.output` bundle 变化，发现大块依赖时按 [Nuxt 应用标准](../standards.md) 分析。
- 第三方脚本和浏览器专属逻辑是否引入水合警告。
