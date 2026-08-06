# Epic 免费游戏公共接口

`GET /v1/epic` 获取 Epic Games 商店当前正在免费和即将免费的游戏，数据来自 Epic Games Store 中国区公开接口。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `encode` / `encoding` | 否 | `json` | `json`、`text`、`markdown`、`md` |

```bash
# JSON 输出
curl 'http://127.0.0.1:3000/v1/epic'

# 纯文本输出
curl 'http://127.0.0.1:3000/v1/epic?encode=text'

# Markdown 输出
curl 'http://127.0.0.1:3000/v1/epic?encode=markdown'
```

## JSON 响应

成功响应的 `data` 是游戏数组：

```json
{
  "code": "OK",
  "message": "获取 Epic 免费游戏成功",
  "data": [
    {
      "id": "example-id",
      "title": "示例游戏",
      "cover": "https://cdn1.epicgames.com/example.jpg",
      "original_price": 62,
      "original_price_desc": "¥62.00",
      "description": "游戏简介。",
      "seller": "示例发行商",
      "is_free_now": true,
      "free_start": "2026-07-30 23:00:00",
      "free_start_at": 1785423600000,
      "free_end": "2026-08-06 23:00:00",
      "free_end_at": 1786028400000,
      "link": "https://store.epicgames.com/zh-CN/p/example"
    }
  ],
  "timestamp": 1785590000000
}
```

`is_free_now` 根据免费活动的起止时间判断；为 `false` 时表示该游戏即将进入免费领取期。时间文本采用上海时区，`*_at` 字段为 Unix 毫秒时间戳。

## 缓存与错误

- 上游数据通过共享缓存保存 10 分钟，客户端成功响应可缓存 5 分钟。
- 上游请求或数据解析失败时返回 `502 UPSTREAM_ERROR`。
