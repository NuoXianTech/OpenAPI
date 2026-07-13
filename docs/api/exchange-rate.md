# 汇率公共接口

汇率接口兼容 `60s-api` 的 `exchange_rate` 能力，并按照当前项目的 REST 路由规范提供为 `GET /v1/exchange-rate`。

## 请求

```http
GET /v1/exchange-rate?currency=CNY&encoding=json
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `currency` | `CNY` | ISO 4217 三位货币代码，不区分大小写 |
| `encoding` | `json` | `json`、`text`、`markdown` 或 `md` |
| `encode` | - | `encoding` 的兼容别名 |

JSON 成功响应使用公共 API 响应壳，`data` 包含基准货币、上次与下次更新时间以及全部汇率。`text` 和 `markdown` 成功响应直接返回对应纯文本格式；参数或上游错误仍使用标准 JSON 错误响应。

## 缓存

上游数据通过项目共享缓存保存 6 小时。Redis 可用时，多实例共享缓存并通过分布式锁合并并发回源；Redis 不可用时退化为进程内缓存。HTTP 成功响应允许客户端缓存 1 小时。

上游数据来源：`https://open.er-api.com/v6/latest/{currency}`。
