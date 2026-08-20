# 公共接口业务配置

Platform v1 不包含具体公共接口实现，也不提供接口专用配置页面。业务配置由 Service 通过通用 Schema 声明，Platform 负责渲染、加密保存和同步。

当前职责划分：

- 公开路径、Method、API Key、Scope、限流、积分、统计和 Target 负载策略由 Platform Route/Upstream 管理。
- 音乐平台开关/Cookie、IP 数据库授权密钥、Crypto 算法开关等业务字段由 API Service 声明。
- Platform 通过 `openapi-service/v1` 控制协议读取通用配置 Schema，自动生成表单、加密保存 Secret，并同步到同一 Upstream 的全部启用 Target。

管理员操作路径：

1. 打开 `/admin/apis/upstreams`。
2. 创建 Internal Upstream 并填写 Service Token 与 Target。
3. 进入 `/admin/apis/upstreams/:id`，点击“发现 Service”。
4. 在自动生成的配置表单中保存业务配置。
5. 返回 `/admin/apis`，在接口目录选择需要公开的 Endpoint 并点击发布；Platform 自动创建 Route 和 Routing Revision。

Platform 只理解 boolean、text、textarea、secret、number、single-select 和 multi-select 等字段类型，不理解音乐、IP、Crypto 的业务语义。第三方开发者新增字段时只修改自己部署的 `openapi-service` 源码和 Schema，不需要修改 Platform。

详细协议见：

- [Platform 与 Service 运行时协议](../architecture/runtime-protocols.md)
- [Service 架构](../architecture/service.md)
- [Platform 与 Service 集成测试](../operations/service-integration-testing.md)

禁止在 Platform 中增加业务 Handler，或让 Service 在运行时加载远程模块和任意脚本。
