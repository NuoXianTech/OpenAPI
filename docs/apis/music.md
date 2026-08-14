# 音乐公共接口

音乐接口只提供一个入口：`GET /v1/music`。调用方式参考 Meting，平台差异、签名、Cookie 和上游字段均由服务端处理。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `server` | 否 | `netease` | `netease`、`tencent`、`kugou`、`baidu`、`kuwo` |
| `type` | 否 | `search` | `search`、`song`、`album`、`artist`、`playlist`、`url`、`pic`、`lrc` |
| `id` | 是 | - | `search` 时为关键词；`song` 等其他类型时为对应资源 ID |
| `page` | 否 | `1` | 仅用于 `search`，范围 `1~1000` |
| `limit` | 否 | 搜索 `30`、歌手 `50` | 仅用于 `search` 或 `artist`，范围 `1~100` |

后台默认启用全部五个平台。`baidu` 是千千音乐的兼容平台代码，内部使用千千音乐当前的签名接口；保留该代码是为了兼容原 Meting 调用参数。

`type` 省略时固定默认为 `search`。因此 `?id=29732992` 会搜索关键词 `29732992`，不会自动判断为歌曲 ID；按 ID 获取歌曲详情时必须显式传 `type=song`。这是为了避免数字歌名、专辑名和平台 ID 之间产生不可预测的自动判断。

```bash
# 搜索
curl 'http://127.0.0.1:3000/v1/music?server=netease&type=search&id=周杰伦'

# 按歌曲 ID 获取详情
curl 'http://127.0.0.1:3000/v1/music?server=netease&type=song&id=29732992'

# 获取歌单
curl 'http://127.0.0.1:3000/v1/music?server=netease&type=playlist&id=歌单ID'
```

`platform`、`q`、`pageSize`、数字搜索 `type`、`bitrate` 和 `size` 已不属于当前契约。

## JSON 结果

`search`、`song`、`album`、`artist` 和 `playlist` 返回标准响应壳。歌曲项不会暴露上游的播放、封面和歌词 ID，而是直接返回可调用链接：

```json
{
  "code": "OK",
  "message": "获取音乐数据成功",
  "data": {
    "server": "netease",
    "type": "search",
    "items": [
      {
        "id": "186016",
        "title": "晴天",
        "artist": "周杰伦",
        "album": "叶惠美",
        "url": "https://api.example.com/v1/music?server=netease&type=url&id=...",
        "pic": "https://api.example.com/v1/music?server=netease&type=pic&id=...",
        "lrc": "https://api.example.com/v1/music?server=netease&type=lrc&id=..."
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 30
  },
  "timestamp": 1700000000000
}
```

搜索和集合结果中的 `id` 是平台主歌曲 ID，可继续用于 `type=song`。`url`、`pic`、`lrc` 可能分别依赖歌曲 hash、专辑图片 ID 等不同的上游标识，不要自行把主歌曲 ID 填入这三个类型；直接调用每首歌曲返回的 `url`、`pic`、`lrc` 链接即可。

如果后台要求 API Key，继续调用 `url`、`pic` 或 `lrc` 链接时也应携带同一个 `x-api-key` 请求头；链接不会把密钥写入 URL。

## 资源响应

- `type=url`：成功时 `302` 跳转到音频地址。
- `type=pic`：成功时 `302` 跳转到封面地址。
- `type=lrc`：成功时直出 `text/plain; charset=utf-8` 的 LRC，存在翻译歌词时会合并到对应时间行。
- `song`、`album`、`artist`、`playlist` 或歌词不存在时返回 `404`，搜索无结果仍返回空的成功列表。
- 参数错误、资源不存在或上游失败：返回标准 JSON 错误响应。

第三方平台可能因版权、区域、会员或登录状态返回空资源，接口不会绕过上游访问控制。
