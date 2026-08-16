# 短视频解析公共接口

短视频接口通过一个入口解析受支持平台的分享链接，并将各平台不一致的返回值转换为稳定结构。调用方只需要提供 `url`，不需要指定平台、Cookie、代理或媒体质量。

## 请求

```http
GET /v1/short-video?url=<分享链接或完整分享文案>
```

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 是 | HTTP/HTTPS 分享链接，或包含分享链接的完整分享文案；最长 4096 个字符。 |

服务端提取文案中的第一个链接并自动识别平台。当前支持：

| 平台 | 常见域名 |
| --- | --- |
| 抖音 | `douyin.com`、`iesdouyin.com` |
| 快手 | `kuaishou.com`、`gifshow.com` |
| 小红书 | `xiaohongshu.com`、`xhslink.com`、`xhs.com` |
| Bilibili | `bilibili.com`、`b23.tv` |
| 微博 | `weibo.com`、`weibo.cn`、`t.cn` |
| 皮皮虾 | `pipix.com`、`pipixia.com` |
| 皮皮搞笑 | `ippzone.com`、`pipigx.com` |
| 今日头条 | `toutiao.com`、`ixigua.com` |

示例：

```bash
curl --get 'https://api.example.com/v1/short-video' \
  --data-urlencode 'url=https://v.douyin.com/example/'
```

## 成功响应

```json
{
  "code": "OK",
  "message": "短视频解析成功",
  "data": {
    "platform": "douyin",
    "type": "video",
    "author": "人民日报",
    "uid": "rmrbxmt",
    "avatar": "https://example.com/avatar.jpg",
    "like": 13089857,
    "time": 1555982844,
    "title": "人民海军生日快乐！",
    "cover": "https://example.com/cover.jpg",
    "url": "https://www.iesdouyin.com/aweme/v1/play/?video_id=example&ratio=1080p&line=0",
    "images": [],
    "livePhotos": [],
    "music": {
      "title": "",
      "author": "人民日报",
      "url": "",
      "avatar": "https://example.com/music-avatar.jpg"
    }
  },
  "timestamp": 1785580800000
}
```

`data` 使用扁平字段：作者名称、UID、头像、点赞数、发布时间、标题、封面和主媒体地址均可直接读取。`time` 统一为 Unix 秒；来源平台没有提供点赞数或发布时间时，`like`、`time` 返回 `null`。`type` 可能是 `video`、`image` 或 `live`；图集和实况内容分别放入 `images`、`livePhotos`，没有音乐时 `music` 返回 `null`。

顶层继续遵循项目统一响应壳，因此使用 `code: "OK"`、`message` 和 `timestamp`，不会让该接口单独改成数字 `code` 与 `msg`。媒体签名地址通常会过期，因此响应使用 `Cache-Control: no-store`。

## 错误

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| 400 | `MISSING_PARAMETER` | 缺少 `url`。 |
| 400 | `INVALID_PARAMETER` | 输入过长、没有合法链接、包含凭据或使用自定义端口。 |
| 422 | `UNSUPPORTED_PLATFORM` | 无法识别为受支持平台。 |
| 422 | `PARSE_FAILED` | 分享内容不存在、已失效，或来源平台页面暂时无法解析。 |
| 502 | `UPSTREAM_ERROR` | 请求来源平台的官方页面或 API 失败。 |
| 502 | `UPSTREAM_INVALID_RESPONSE` | 来源平台返回非 JSON、超大或无效结构。 |
| 503 | `UPSTREAM_BUSY` | 来源平台达到并发或速率限制；可按 `Retry-After` 重试。 |

## 工作方式与后台启用

解析逻辑运行在当前 OpenAPI 服务端内，并直接访问各来源平台的官方分享页或公开接口。无需填写第三方解析地址，无需部署兼容解析服务，也没有短视频专属的后台业务能力配置。

所有来源请求都限制为对应平台的公网 HTTPS 域名，并设置超时、重定向次数和最大响应大小。调用方只提交原始 `url`；Cookie、代理地址、平台名和画质均不属于公共契约。

新增路由后重启开发服务器，使 manifest 注册 `v1/short-video`。随后在“管理后台 → 接口管理”中设置 API Key、限流、计费等通用治理项并启用接口即可。

来源平台可能调整页面结构、签名或访问限制，因此个别平台可能出现临时解析失败。接口不会绕过登录、会员、地区、版权或其他访问控制。

## 参考与许可证

部分平台字段提取规则参考了仓库内的 `dist/api/short_videos` 实现，并已改写为当前项目的 TypeScript 服务端逻辑；运行时不会调用该项目的演示接口或其他第三方解析服务。参考代码采用 MIT 许可证，详见 [dist/api/short_videos/LICENSE](../../dist/api/short_videos/LICENSE)。

解析结果只应用于已获得授权的内容，并遵守来源平台规则及相关法律法规。
