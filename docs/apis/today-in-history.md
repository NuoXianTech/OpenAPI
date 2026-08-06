# 历史上的今天公共接口

`GET /v1/today-in-history` 查询指定月日发生的历史事件，数据来源为百度百科公开的历史事件月度数据。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `date` | 否 | 上海时区的当天 | 支持 `MM-DD` 或 `YYYY-MM-DD`，年份只用于校验日期是否合法 |
| `encode` / `encoding` | 否 | `json` | `json`、`text`、`markdown`、`md` |

```bash
# 查询今天
curl 'http://127.0.0.1:3000/v1/today-in-history'

# 查询 8 月 1 日
curl 'http://127.0.0.1:3000/v1/today-in-history?date=08-01'

# Markdown 输出
curl 'http://127.0.0.1:3000/v1/today-in-history?date=08-01&encode=markdown'
```

## JSON 响应

```json
{
  "code": "OK",
  "message": "获取历史上的今天成功",
  "data": {
    "date": "08-01",
    "month": 8,
    "day": 1,
    "items": [
      {
        "title": "示例历史事件",
        "year": "1927",
        "description": "事件简介。",
        "event_type": "event",
        "link": "https://baike.baidu.com/item/example"
      }
    ],
    "total": 1
  },
  "timestamp": 1700000000000
}
```

`event_type` 可能是：

- `birth`：人物出生。
- `death`：人物逝世。
- `event`：其他历史事件。

公元前年份以负数字符串表示，例如 `"-10"`。文本和 Markdown 输出会显示为“公元前 10 年”。

## 错误响应

- 日期格式错误或日期不存在：`400 INVALID_DATE`。
- 上游请求、响应结构或 JSON 解析失败：`502 UPSTREAM_ERROR`。

月度历史数据会进行共享缓存；接口响应允许客户端缓存一小时。
