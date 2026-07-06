# 工程标准

本目录沉淀 OpenAPI 的 Nuxt 4、Nuxt UI 4、TypeScript、Tailwind CSS 与性能标准。它不替代业务文档，而是为所有代码和文档提供统一的工程判断。

## 官方依据

本次整理参考了 MCP 暴露的 Nuxt 与 Nuxt UI 文档索引，并补充核对官方页面：

- Nuxt 4：Introduction、Directory Structure、Data Fetching、Runtime Config、Hydration、Performance、Testing、Deployment。
- Nuxt UI 4：Getting Started、Design System、CSS Variables、Customize Components、Content integration、Dashboard components。
- 官方入口：[Nuxt 4 文档](https://nuxt.com/docs/4.x/getting-started/introduction)、[Nuxt UI 文档](https://ui.nuxt.com/docs/getting-started)。

## 文档索引

| 文档 | 用途 |
| --- | --- |
| [文档写作标准](./documentation.md) | Markdown 结构、入口页、流程页、代码示例、链接和维护规则 |
| [Nuxt 应用标准](./nuxt-application.md) | 目录、TypeScript、数据获取、运行时配置、SSR、水合、性能与测试约束 |
| [Nuxt UI 标准](./nuxt-ui.md) | Nuxt UI、Reka UI、Tailwind CSS、主题 token、组件组合与后台界面规范 |

## 统一原则

- 优先遵循 Nuxt 4 的 `app/`、`server/`、`shared/`、`modules/` 目录语义，不引入平行的自定义约定。
- 优先使用 Nuxt 自动导入、Composition API、Nuxt UI 组件、VueUse 组合式函数和项目已有组件。
- 所有业务示例使用 TypeScript；接口优先于类型别名；函数使用 `function` 关键字；避免 `class` 和 `enum`。
- 文档必须服务交付效率：入口页负责导航，规范页负责边界，流程页负责可执行步骤。
- 生产文档必须覆盖发布前、发布中、发布后和异常恢复，不能只描述理想路径。

## 变更自检

提交前对照以下问题：

| 检查项 | 通过标准 |
| --- | --- |
| 目录边界 | 新文件放在 Nuxt 官方语义或项目既有语义下 |
| 类型安全 | 无隐式 `any`，共享契约在 `shared/` 中复用 |
| SSR 一致性 | 首屏内容不依赖浏览器随机值、时间差或客户端专属 API |
| UI 一致性 | 使用 Nuxt UI 语义组件、主题 token 与 `i-mdi-*` 图标 |
| 性能 | 非关键重组件动态加载，图片有尺寸，长列表分页或虚拟化 |
| 生产 | 运行时配置不烤进构建产物，变更有测试或明确风险说明 |
| 文档 | 新增入口已挂载，命令可复制，链接可解析，密钥不落文 |
