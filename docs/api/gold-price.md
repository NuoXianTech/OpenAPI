# 贵金属价格公共接口

`GET /v1/gold-price` 获取贵金属实时行情、主要金店黄金价格、银行金条价格和黄金回收价格。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `encode` / `encoding` | 否 | `json` | `json`、`text`、`markdown`、`md` |

```bash
# JSON 输出
curl 'http://127.0.0.1:3000/v1/gold-price'

# 纯文本输出
curl 'http://127.0.0.1:3000/v1/gold-price?encode=text'

# Markdown 输出
curl 'http://127.0.0.1:3000/v1/gold-price?encode=markdown'
```

## JSON 数据

成功响应的 `data` 包含四组数据：

- `metals`：黄金、白银、铂金和钯金等实时行情。
- `stores`：周大福、老凤祥、周生生和老庙的黄金价格。
- `banks`：主要银行的金条价格。
- `recycle`：黄金、白银、铂金和钯金回收价格。

```json
{
  "code": "OK",
  "message": "获取贵金属价格成功",
  "data": {
    "date": "2026-08-01",
    "metals": [
      {
        "name": "黄金_9999",
        "sell_price": "881",
        "today_price": "881.6",
        "high_price": "884",
        "low_price": "876",
        "unit": "元/克",
        "updated": "2026-08-01 09:32:06",
        "updated_at": 1785519126000
      }
    ],
    "stores": [],
    "banks": [],
    "recycle": []
  },
  "timestamp": 1785590000000
}
```

价格字段沿用参考接口的字符串形式，其中 `today_price` 表示今日开盘价；无法取得的行情显示为 `N/A`。时间文本采用上海时区，`updated_at` 为 Unix 毫秒时间戳。

## 数据来源、缓存与错误

- 行情来自金投网公开使用的 HTTPS 行情接口。
- 上游数据通过共享缓存保存 2 分钟，客户端成功响应可缓存 1 分钟。
- 上游请求、脚本格式或数据解析失败时返回 `502 UPSTREAM_ERROR`。
