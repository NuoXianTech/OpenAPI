# 猫眼公共接口

猫眼接口按当前项目的公共 API 规范提供全球电影票房、实时电影票房、电视收视率和网播热度。

## 接口

| 方法与路径 | 功能 |
| --- | --- |
| `GET /v1/maoyan/all/movie` | 全球电影票房总榜 |
| `GET /v1/maoyan/movie` | 实时电影票房 |
| `GET /v1/maoyan/tv` | 实时电视收视率 |
| `GET /v1/maoyan/web` | 实时网播热度 |

实时榜单示例：

```http
GET /v1/maoyan/movie?date=2026-07-14&encoding=json
```

## 参数

| 参数 | 适用接口 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `date` | 实时榜单 | 当日 | 有效的 `YYYY-MM-DD` 日期；具体可查询范围由猫眼上游决定 |
| `encoding` | 全部 | `json` | `json`、`text`、`markdown` 或 `md` |
| `encode` | 全部 | - | `encoding` 的等价别名 |

JSON 成功响应使用项目标准 OpenAPI 响应壳。`text` 和 `markdown` 成功响应返回裸文本并设置相应的 `Content-Type`；参数错误和上游错误仍返回标准 JSON 错误响应。

## 缓存与上游保护

- 全球电影票房总榜通过共享缓存保存 6 小时，HTTP 客户端缓存 1 小时。
- 当日实时榜通过共享缓存保存 60 秒，指定日期榜保存 1 小时。
- 共享缓存使用 Redis 时支持多实例共享及并发回源合并；Redis 不可用时自动退化为进程内缓存。
- 猫眼数据请求设置 15 秒超时，动态字体请求设置 10 秒超时；非成功 HTTP 响应会转换为 `502 UPSTREAM_ERROR`。
- 公共 API 网关还可按 `maoyan` 接口组配置 API Key、QPS、分钟/小时/日限流和每日配额。

电影实时票房中的混淆数字使用猫眼返回的动态 WOFF 字体和本地字形特征进行解码。数据来源：猫眼专业版。
