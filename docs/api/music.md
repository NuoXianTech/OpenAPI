# 音乐公共接口

音乐接口位于 `/v1/music`，参考 Meting 的统一数据模型，在本项目内以函数式 TypeScript 自行实现，不依赖 Meting 运行时。

## 支持平台

- `netease`：网易云音乐
- `tencent`：QQ 音乐
- `kugou`：酷狗音乐
- `baidu`：百度音乐
- `kuwo`：酷我音乐

所有资源接口通过 `platform` 查询参数选择平台，默认 `netease`。

## Endpoint

| Endpoint | 参数 | 说明 |
| --- | --- | --- |
| `GET /v1/music` | 无 | 平台和能力列表 |
| `GET /v1/music/search` | `q`、`platform`、`page`、`pageSize`、`type` | 搜索歌曲 |
| `GET /v1/music/songs/{id}` | `platform` | 歌曲详情 |
| `GET /v1/music/albums/{id}` | `platform` | 专辑歌曲 |
| `GET /v1/music/artists/{id}` | `platform`、`limit` | 歌手作品 |
| `GET /v1/music/playlists/{id}` | `platform` | 歌单歌曲 |
| `GET /v1/music/songs/{id}/url` | `platform`、`bitrate` | 播放地址 |
| `GET /v1/music/songs/{id}/lyrics` | `platform` | 标准纯文本 LRC 原文歌词 |
| `GET /v1/music/songs/{id}/picture` | `platform`、`size` | 封面地址 |

第三方音乐平台可能依据版权、登录状态、区域和会员状态返回空播放地址。接口不会绕过上游访问控制。

## LRC 歌词响应

歌词接口成功时不使用 OpenAPI JSON 响应壳，直接返回 UTF-8 编码的标准 LRC 纯文本：

```http
Content-Type: text/plain; charset=utf-8
```

```lrc
[00:00.00]歌词内容
[00:05.20]下一句歌词
```

参数错误或上游请求失败时，仍返回符合公共接口规范的 JSON 错误响应。

