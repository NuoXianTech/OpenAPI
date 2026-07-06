# 生产就绪清单

本清单用于发布 OpenAPI 到生产环境前的最终确认。项目生产目标是单个 Node/Nitro 进程加一个 PostgreSQL 数据库，不支持多个 Node 实例共享同一个生产数据库。

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
| 数据库 | `DATABASE_URL` 指向生产 PostgreSQL，账号权限满足迁移和运行 |
| 运行时密钥 | `NUXT_AUTH_JWT_SECRET`、`NUXT_AUTH_API_KEY_SECRET`、`NUXT_AUTH_EMAIL_VERIFY_SECRET` 已独立生成 |
| 管理员账号 | 初始账号可登录，默认密码发布后立即修改 |
| 网络 | Nitro 监听 `127.0.0.1:<port>`，公网由 Nginx 或等价代理接入 |
| 时区 | `TZ=Asia/Shanghai`，数据库和应用日志时间口径一致 |
| 备份 | 发布前有数据库备份或可恢复快照 |
| 巡检 | 发布负责人已阅读 [生产运行手册](./production-runbook.md) 的回滚和异常处置 |

完整变量见 [运行时配置](./runtime-config.md)。

## 发布步骤

1. 在本地或 CI 运行发布前门禁。
2. 上传完整 `.output` 目录到服务器的新版本目录。
3. 设置或确认运行时环境变量。
4. 启动 `.output/start.mjs`，让启动脚本先运行迁移再启动 Nitro。
5. 切换 Nginx upstream 或重启 PM2 进程。
6. 执行健康检查和关键路径冒烟。

## 健康检查

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/list
```

随后人工验证：

- 首页可打开，首屏无明显布局跳动。
- 管理员可登录并进入后台。
- 用户登录、API Key 列表、公开 API 列表可用。
- 一个低风险公开 API 可被 API Key 调用，调用日志和统计写入正常。
- PM2 日志无启动迁移错误、鉴权密钥错误或数据库连接错误。
- `pending_charges` 没有异常增长，调用日志和积分流水符合预期。

## Web Vitals 基线

发布后至少抽查首页、公开 API 列表页、用户后台和管理后台入口：

| 指标 | 目标 | 优化方向 |
| --- | --- | --- |
| LCP | 小于 2.5s | 保持首屏 SSR，减少阻塞资源，优化首屏图片尺寸和格式 |
| CLS | 小于 0.1 | 图片、图表、表格和统计卡声明稳定尺寸 |
| INP | 小于 200ms | 长列表分页，重图表懒加载，减少 hydration 阶段插件工作 |

可使用 Lighthouse、Chrome Performance 面板、PageSpeed Insights 或 WebPageTest。发现大 bundle 时使用 Nuxt analyze 定位依赖，再按 [Nuxt 应用标准](../standards/nuxt-application.md) 拆分。

## 回滚策略

- 保留上一版 `.output` 目录和对应环境变量。
- 数据库迁移发布前先备份；如果迁移不可逆，发布说明必须写清业务回滚路径。
- 应用层回滚优先切换 PM2 指向上一版目录，再执行健康检查。

```bash
pm2 stop openapi
cd /path/to/previous/.output
pm2 start start.mjs --name openapi --update-env
pm2 save
```

## 运行期观察

| 观察项 | 异常信号 |
| --- | --- |
| PM2 日志 | 迁移失败、数据库连接失败、未配置 JWT secret |
| 数据库 | `pending_charges` 持续增长或出现大量 `dead_letter` |
| API 网关 | 401/403/429 异常升高 |
| 资源 | CPU、内存、连接数持续接近上限 |
| 前端 | Lighthouse 分数下降，LCP/CLS/INP 超过目标 |
