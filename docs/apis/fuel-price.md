# 油价公共接口

## 查询油价

`GET /v1/fuel-price` 查询国内地区油价，默认查询北京。

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `region` | `北京` | 省、市或区县简称，例如 `杭州`、`西湖` |
| `encode` / `encoding` | `json` | `json`、`text`、`markdown` 或 `md` |
| `force-update` | `false` | `1`、`true`、`yes` 时跳过服务端缓存并重新抓取 |

```bash
curl 'http://127.0.0.1:3000/v1/fuel-price?region=杭州'
curl 'http://127.0.0.1:3000/v1/fuel-price?region=北京&encode=markdown'
```

JSON `data` 包含地区、油价项目、调价趋势、来源链接和更新时间：

```json
{
  "region": "北京市",
  "trend": null,
  "items": [{ "name": "92号汽油", "price": 7.85, "price_desc": "7.85 元/升" }],
  "link": "http://www.qiyoujiage.com/beijing.shtml",
  "updated": "2026-08-06 12:00:00",
  "updated_at": 1785988800000
}
```

地区不存在时返回 `400 UNSUPPORTED_REGION`；上游请求或解析失败时返回 `502 UPSTREAM_ERROR`。默认缓存 60 分钟，`force-update` 会绕过该缓存。

## 地区列表

`GET /v1/fuel-price/regions` 返回支持的地区清单，可用 `keyword` 按地区名称过滤：

```bash
curl 'http://127.0.0.1:3000/v1/fuel-price/regions?keyword=浙江'
```

成功响应的 `data` 为 `{ total, items }`，每个地区项包含 `region`、上游相对路径 `url` 和完整 `link`。
