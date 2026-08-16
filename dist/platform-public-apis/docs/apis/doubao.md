# 豆包资源解析公共接口

豆包接口组用于从豆包、千问和云雀（剪映）分享链接中提取图片或视频资源。

## 接口

| 方法与路径 | 功能 | 支持来源 |
| --- | --- | --- |
| `GET /v1/doubao` | 查询当前启用的解析能力 | 动态返回 |
| `GET /v1/doubao/images` | 解析对话图片 | 豆包、千问 |
| `GET /v1/doubao/videos` | 解析分享视频 | 豆包、云雀 |

## 请求参数

| 参数 | 适用接口 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | `images`、`videos` | 是 | 合法 HTTPS 分享链接 |
| `raw` | `images`、`videos` | 否 | `1`、`true` 或 `yes` 时返回上游原始数据，默认 `false` |

来源由链接域名自动识别，不需要额外传递平台参数。接口只接受 HTTPS 链接，并拒绝带认证信息或非标准端口的地址。

## 标准结果

图片解析返回：

```json
{
  "code": "OK",
  "message": "图片解析成功",
  "data": {
    "source": "doubao",
    "count": 1,
    "images": [{ "url": "https://example.com/image.jpg" }]
  },
  "timestamp": 1785590000000
}
```

视频解析返回 `source`、`count` 和 `videos`，视频项包含 `url`、`width`、`height`、`definition`、`poster_url`，以及可选的时长和编码字段。`raw=true` 时，`data` 改为 `{ source, raw }`，不保证上游字段稳定。

## 错误与配置

- `400 MISSING_PARAMETER` / `INVALID_PARAMETER`：缺少参数、链接不安全或链接格式不支持。
- `403 DOUBAO_SOURCE_DISABLED`：管理员关闭了对应来源。
- `502 UPSTREAM_ERROR` / `PARSE_FAILED`：上游请求失败或页面结构无法解析。

来源开关在接口能力配置中管理；关闭来源不会影响其他来源。解析结果来自分享页或上游公开接口，不保证长期可用。
