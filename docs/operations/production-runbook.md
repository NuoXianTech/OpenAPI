# 生产运行手册

本手册用于 OpenAPI 上线后的日常运行、异常排查和恢复。部署模型保持单个 Node/Nitro 进程加一个 PostgreSQL 数据库，所有监控和处置都围绕这个边界设计。

## 运行边界

| 项目 | 约束 |
| --- | --- |
| 应用进程 | 单 Node/Nitro 进程，不做多实例横向扩展 |
| 数据库 | 单 PostgreSQL 实例，迁移由 `.output/start.mjs` 启动前执行 |
| 限流 | 进程内内存计数，重启会清空 |
| 扣费重试 | `pending_charges` 由同一 Node 进程定时扫描 |
| 代理 | 生产公网流量由 Nginx 或等价代理转发到 `127.0.0.1:<NITRO_PORT>` |

## 日常巡检

每日或发布后检查：

```bash
pm2 status openapi
pm2 logs openapi --lines 120
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/list
```

数据库侧重点：

| 检查项 | 异常信号 |
| --- | --- |
| `pending_charges` | 持续增长、出现大量 `dead_letter` |
| `api_calls` | 失败率突然升高、某 API 调用量异常 |
| `api_call_stats` | 日聚合缺失或延迟明显 |
| `login_logs` | 管理员登录失败集中爆发 |
| `operation_logs` | 敏感配置被频繁修改 |

## 日志定位

| 现象 | 优先查看 |
| --- | --- |
| 服务无法启动 | PM2 日志、`DATABASE_URL`、迁移输出、端口占用 |
| 管理后台无法登录 | `NUXT_AUTH_SECRET`、管理员账号、登录日志 |
| API Key 全部失效 | `NUXT_AUTH_API_KEY_SECRET` 是否变化、API Key 记录是否被撤销 |
| 邮箱验证失败 | `NUXT_AUTH_SECRET`、SMTP 配置、邮件发送日志 |
| 公开 API 429 增多 | API 配置、内存限流窗口、调用方 IP 或 key |
| 扣费异常 | `api_calls`、`credit_transactions`、`pending_charges` |

## 备份策略

生产数据库至少保留每日备份。发布数据库迁移前必须手动创建一次备份或快照。

```bash
pg_dump "$DATABASE_URL" --format=custom --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

备份文件应离开应用服务器保存，避免服务器磁盘故障时同时丢失应用和备份。

## 恢复演练

恢复到临时数据库验证备份可用：

```bash
createdb openapi_restore_test
pg_restore --dbname=openapi_restore_test --clean --if-exists backup-YYYYMMDD-HHMMSS.dump
```

恢复生产前先停止应用进程，避免旧进程继续写入：

```bash
pm2 stop openapi
pg_restore --dbname="$DATABASE_URL" --clean --if-exists backup-YYYYMMDD-HHMMSS.dump
cd .output
pm2 restart openapi --update-env
```

如果迁移不可逆，优先回滚应用版本并评估数据修复脚本，不直接强行恢复旧库覆盖新业务数据。

## 安全巡检

| 项目 | 要求 |
| --- | --- |
| 管理员密码 | 通过 `NUXT_AUTH_ADMIN_PASSWORD` 配置，定期在环境变量中轮换并重启进程 |
| 运行时密钥 | 每个环境独立生成，泄露后立即轮换 |
| Nginx | 只开放必要端口，反向代理到本机 Nitro |
| 数据库 | 不暴露公网，账号只给应用所需权限 |
| API Key | 支持作用域、IP 白名单、配额、有效期和吊销 |
| 日志 | 不记录 API Key 明文、密码、验证码或完整 token |

## 异常处置

1. 先确认影响范围：首页、管理后台、用户后台、公开 API、数据库、邮件、第三方 OAuth。
2. 冻结变更：暂停发布、停止批量任务、保留日志。
3. 读取 PM2 日志和数据库关键表，定位最近一次配置或代码变更。
4. 如果影响公开 API 收费，检查 `pending_charges` 和 `credit_transactions` 是否需要人工补偿。
5. 能快速回滚应用时先回滚应用；涉及数据库结构时先备份当前状态。
6. 恢复后补充事件记录：时间线、根因、影响、修复、预防项。

## 性能观察

发布后关注：

- 首页和后台入口的 LCP、CLS、INP。
- 图表页和日志页的交互延迟。
- `.output` bundle 变化，发现大块依赖时按 [Nuxt 应用标准](../standards/nuxt-application.md) 分析。
- 第三方脚本和浏览器专属逻辑是否引入水合警告。
