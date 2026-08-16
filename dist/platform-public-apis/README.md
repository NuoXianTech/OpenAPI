# Platform 公共接口源码归档

此目录保存从 `openapi-platform` 运行时移出的 legacy 公共接口源码，供后续逐个迁移到 `openapi-service` 时参考。

归档内容不会被 Nuxt/Nitro 扫描、编译、注册或部署，不能从 Platform 直接调用。需要恢复某项能力时，应在 `openapi-service/src/modules/<name>` 中重新实现并补充 Hono/Zod OpenAPI 契约、测试和文档，再通过 Platform 的 Upstream、Product、Route 与 Routing Revision 发布。

已经完成迁移的 `yiyan`、`player` 和 `ip` 不在此归档中；其实现与契约由 `openapi-service` 仓库维护。

目录结构保留原路径，便于对照：

```text
server/routes/v1/          legacy Nitro Handler
server/lib/                业务实现与旧能力配置
server/api-capabilities/   旧的 Platform 能力声明
docs/apis/                 旧接口文档
test/unit/server/lib/      旧业务测试
```
