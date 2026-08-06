# 播放器 HTML 公共接口

播放器接口根据视频地址生成可直接嵌入页面的播放器 HTML，不代理或下载视频内容。

## DPlayer

`GET /v1/player` 使用 DPlayer：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `url` | - | 必填，HTTP/HTTPS 视频地址 |
| `type` | `auto` | `auto`、`hls`、`flv`、`dash`、`normal` |
| `cover` | 空 | HTTP/HTTPS 封面地址 |
| `live` | `false` | 是否直播 |
| `muted` / `autoplay` / `hideplay` / `loop` | `false` | 播放行为开关 |
| `lang` | `zh-cn` | `en`、`zh-cn`、`zh-tw`、`ko-kr`、`de`、`ja`、`ru` |
| `volume` | `0.7` | `0~1` |

```bash
curl -i 'http://127.0.0.1:3000/v1/player?url=https%3A%2F%2Fcdn.example.com%2Fvideo.m3u8&type=hls'
```

成功时直出 `text/html; charset=utf-8`，并设置 `cache-control: no-store`。`url` 无效时返回 `400 INVALID_PARAMETER`，DPlayer 被管理员关闭时返回 `403 PLAYER_ENGINE_DISABLED`。

## ArtPlayer

`GET /v1/player/art` 使用 ArtPlayer，必填参数仍为 `url`。此外支持：`id`、`type=m3u8|flv|mpd`、`lang=en|zh-cn`、`poster`、`theme`、`volume`，以及 `islive`、`muted`、`autoplay`、`autoplayback`、`hideplay`、`automini`、`loop`、`flip`、`playbackrate`、`aspectratio`、`setting`、`hotkey`、`pip`、`mutex`、`fullscreen`、`fullscreenweb`、`miniprogressbar`、`playsinline` 等布尔开关。

ArtPlayer 同样只返回播放器 HTML，不改变上游资源的访问权限。两个播放器引擎分别由管理员在公共接口能力配置中控制。
