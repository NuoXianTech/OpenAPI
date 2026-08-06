# Bing 每日壁纸公共接口

`GET /v1/bing` 获取必应每日壁纸元数据。接口兼容 `encode` 和 `encoding` 两个输出格式参数。

## 请求参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `encode` / `encoding` | `json` | `json`、`text`、`markdown`、`md`；`image` 返回按 `type` 选择的图片，`image-4k` 返回 UHD 图片 |
| `type` | `auto` | `auto`、`pc`、`mobile`；`auto` 根据 User-Agent 选择桌面或移动端壁纸 |

## 获取 4K 壁纸

使用 JSON 输出时，`data.cover_4k` 是当前壁纸的 Bing UHD 原图地址：

```bash
curl 'http://127.0.0.1:3000/v1/bing?encode=json'
```

```json
{
  "code": "OK",
  "message": "获取必应每日壁纸成功",
  "data": {
    "cover": "https://bing.com/th?id=OHR.Example_1920x1080.jpg",
    "cover_4k": "https://bing.com/th?id=OHR.Example_UHD.jpg"
  },
  "timestamp": 1785590000000
}
```

`cover` 会根据 `type` 选择桌面或移动端尺寸；`cover_4k` 始终保留 UHD 地址，不受 `type` 影响。`text`、`markdown` 和 `image` 输出沿用 `cover`，`image-4k` 直接跳转到 `cover_4k`。

也可以直接获取 4K 图片：

```bash
curl -i 'http://127.0.0.1:3000/v1/bing?encode=image-4k'
```

## 缓存与错误

每日壁纸在服务端按本地日期缓存，成功响应允许客户端缓存 1 小时。Bing 上游不可用或返回无效数据时，接口返回 `502 UPSTREAM_ERROR`。
