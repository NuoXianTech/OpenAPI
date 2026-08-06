# OpenAPI 项目文档

文档按实际工作流程组织。框架通用能力以 Nuxt 4 和 Nuxt UI 4 官方文档为准；这里记录项目特有的接入、统计、计费、后台与生产流程。

目录约定：`docs/apis/` 只放可直接调用的具体公共接口契约；`docs/api/` 放公共接口开发指南、响应规范、能力配置、统计、计费和 RESTful 设计等跨接口规则。

## 开发流程

### 新增公开 API

1. 阅读 [新增公共接口开发指南](./api/public-api-development.md)，完成接口设计、业务实现、后台启用和真实路径验证。
2. 按 [对外接口规范](./api/public-api-conventions.md) 添加路由、验证、响应和计费标记。
3. 如需管理员控制接口业务功能，按 [公共接口业务能力声明规范](./api/public-api-capabilities.md) 声明能力并接入平台配置。
4. 用 [RESTful 设计指南](./api/design-style.md) 检查路径、方法、状态码和错误码。
5. 根据 [调用统计规范](./api/call-statistics.md) 核对日志、次数和成功率口径。
6. 重启同步 manifest，在后台启用接口，完成鉴权、失败和限流冒烟测试。

### 开发后台页面

1. 遵循 [前端工程标准](./standards.md) 的 TypeScript、SSR、性能和 Nuxt UI 基线。
2. 按 [后台页面规范](./frontend/dashboard-pages.md) 复用页面骨架、分页、表格和 overlay。
3. 验证移动端、键盘操作以及加载、空、错误状态。

### 发布生产

1. 按 [发布流程](./operations/release-process.md) 更新版本并触发 GitHub Release 与 GHCR 构建。
2. 根据 [运行时配置](./operations/runtime-config.md) 核对变量和密钥。
3. 按 [生产就绪清单](./operations/production-readiness.md) 执行质量门禁、迁移和回滚准备。
4. 使用 [VPS 部署指南](./operations/vps-deployment.md) 部署已经构建好的产物或容器镜像。
5. 发布后按 [生产运行手册](./operations/production-runbook.md) 完成健康检查、观察和巡检。

## 核心规则

- 公共 API 位于 `server/routes/v{N}/{code}`，业务实现位于 `server/lib`；站内 API 位于 `server/api`。
- 公共接口可在 `server/api-capabilities/v{N}/{code}.ts` 声明管理员可配置的业务能力；配置值统一保存在 PostgreSQL。
- 管理员和用户共用账号体系，以角色区分权限；管理员同时拥有用户侧常规能力。
- 计费、限流、调用日志和统计使用统一服务端链路，单个接口不得自行复制实现。
- 单实例可使用 Node/Nitro；多实例生产环境必须使用 PostgreSQL、共享 Redis 和一致的运行时密钥。
- 计费规则以 [API 计费规则](./platform/billing-rules.md) 为准。

## 内置接口契约

- [Bing 每日壁纸公共接口](./apis/bing.md)
- [豆包资源解析公共接口](./apis/doubao.md)
- [音乐公共接口](./apis/music.md)
- [加密与解密公共接口](./apis/crypto.md)
- [短视频解析公共接口](./apis/short-video.md)
- [历史上的今天公共接口](./apis/today-in-history.md)
- [Epic 免费游戏公共接口](./apis/epic.md)
- [汇率公共接口](./apis/exchange-rate.md)
- [油价公共接口](./apis/fuel-price.md)
- [贵金属价格公共接口](./apis/gold-price.md)
- [随机密码生成公共接口](./apis/password-generator.md)
- [密码强度检测公共接口](./apis/password-check.md)
- [IP 归属地公共接口](./apis/ip.md)
- [猫眼数据公共接口](./apis/maoyan.md)
- [播放器 HTML 公共接口](./apis/player.md)
- [一言公共接口](./apis/yiyan.md)

## 质量门禁

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

涉及数据库、鉴权、计费或部署时，还必须验证迁移、回滚、健康检查和关键链路。

## 文档维护

- 一份文档只负责一个可执行流程或稳定规则，不为目录单独创建空洞的 `index.md`。
- 项目配置以代码、`.env.example` 和 `runtimeConfig` 为事实来源，文档不复制易过期的完整清单。
- 使用相对链接；示例不得包含真实密钥、用户数据或生产地址。
- 行为变化必须同步更新对应流程与检查项。
