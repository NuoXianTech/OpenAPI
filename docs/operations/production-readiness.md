# 生产就绪清单

本清单用于发布 OpenAPI 到生产环境前的最终确认。单实例可使用 PostgreSQL 或显式配置的 PGlite；多实例必须使用 PostgreSQL、共享 Redis 和强制 Redis 模式。

## 发布前门禁

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

失败即停止发布。涉及公开 API、积分、鉴权、数据库 schema 或后台统计时，测试必须覆盖核心分支；暂未覆盖的风险要写进发布说明。

## 配置核验

| 项目 | 检查 |
| --- | --- |
| 数据库 | PostgreSQL：`DATABASE_URL` 指向生产库，账号权限满足迁移和运行；PGlite：设置 `DATABASE_DRIVER=pglite` 并确认 `PGLITE_DATA_DIR` 是持久化目录 |
| 数据库迁移 | 已基于当前 Drizzle schema 生成迁移；`.output/server/db/migrations/postgresql` 随构建产物发布，生产启动时自动应用到 PostgreSQL 或 PGlite |
| 运行时密钥 | `NUXT_AUTH_SECRET`、`NUXT_API_KEY_SECRET` 已独立生成并完成安全备份 |
| Redis | 使用共享限流、短缓存和任务协调时配置 `NUXT_REDIS_URL`；多实例必须设置 `NUXT_REDIS_REQUIRED=true` |
| 管理员账号 | 首次启动时从受控服务端日志读取一次性随机初始密码，立即登录并完成不可跳过的资料和密码初始化 |
| 网络 | Nitro 监听 `127.0.0.1:<port>`，公网由 Nginx 或等价代理接入；按实际拓扑配置可信代理 CIDR 和转发层数 |
| API Key 数据 | 确认数据库仅保存摘要、密文与掩码预览；`NUXT_API_KEY_SECRET` 与数据库备份分开保存，明文不进入操作日志或普通应用日志 |
| 部署产物 | 完整发布 `.output`；跨系统部署优先使用 Linux CI/Docker，不能遗漏 `node_modules/.nitro` |
| 时区 | `TZ=Asia/Shanghai`；启动迁移会将数据库迁移会话设置为同一时区，数据库默认时区无需额外修改 |
| 备份 | PostgreSQL 有数据库备份或可恢复快照；PGlite 已备份 `PGLITE_DATA_DIR` |
| 巡检 | 发布负责人已阅读 [生产运行手册](./production-runbook.md) 的回滚和异常处置 |

完整变量见 [运行时配置](./runtime-config.md)。

## 发布步骤

1. 在本地或 CI 运行发布前门禁，避免在资源较小的生产服务器上执行 `pnpm build`。
2. 设置或确认运行时环境变量。
3. 上传完整 `.output` 目录到服务器的新版本目录。
4. 切换 Nginx upstream 或重启 PM2 进程；Node 进程启动时会先运行 Drizzle 迁移。
5. 执行健康检查和关键路径冒烟。

## 健康检查

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
curl -fsS http://127.0.0.1:3000/api/catalog
```

随后人工验证：

- 首页可打开，首屏无明显布局跳动。
- 管理员可通过统一 `/login` 登录并进入后台；用户仍只能看到用户工作区。
- 用户登录、API Key 列表、公开 API 列表可用。
- 一个低风险公开 API 可被 API Key 调用，调用日志和统计写入正常。
- PM2 日志无鉴权密钥错误、数据库连接错误或 `[db:migrate]` 失败记录。
- `api_credit_reservations` 没有积压的 `pending` 或 `dead_letter`，调用日志和积分流水符合预期。
- 静态资源在 `Accept-Encoding: br, gzip` 下返回 `Content-Encoding: br` 或 `gzip`。
- HTML 响应包含 CSP、HSTS、`X-Content-Type-Options`、Referrer Policy 和 Permissions Policy。

## Web Vitals 基线

发布后至少抽查首页、公开 API 列表页、用户后台和管理后台入口：

| 指标 | 目标 | 优化方向 |
| --- | --- | --- |
| LCP | 小于 2.5s | 保持首屏 SSR，减少阻塞资源，优化首屏图片尺寸和格式 |
| CLS | 小于 0.1 | 图片、图表、表格和统计卡声明稳定尺寸 |
| INP | 小于 200ms | 长列表分页，重图表懒加载，减少 hydration 阶段插件工作 |

可使用 Lighthouse、Chrome Performance 面板、PageSpeed Insights 或 WebPageTest。发现大 bundle 时使用 Nuxt analyze 定位依赖，再按 [Nuxt 应用标准](../standards.md) 拆分。

## 回滚策略

- 保留上一版 `.output` 目录和对应环境变量。
- 数据库迁移会在新版本启动时自动执行，发布前先备份 PostgreSQL 或 PGlite 数据目录；如果迁移不可逆，发布说明必须写清业务回滚路径。
- 应用层回滚优先切换 PM2 指向上一版目录，再执行健康检查。

```bash
pm2 stop openapi
cd /path/to/previous/.output
NODE_ENV=production pm2 start server/index.mjs --name openapi --update-env
pm2 save
```

## 运行期观察

| 观察项 | 异常信号 |
| --- | --- |
| PM2 日志 | 迁移失败、数据库连接失败、未配置 JWT secret |
| 数据库 | `api_credit_reservations` 中 `pending` 持续增长、出现 `dead_letter`，或 PGlite 数据目录磁盘空间不足 |
| API 网关 | 401/403/429 异常升高 |
| 资源 | CPU、内存、连接数持续接近上限 |
| 前端 | Lighthouse 分数下降，LCP/CLS/INP 超过目标 |
