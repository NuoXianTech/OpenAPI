# 一言公共接口

`GET /v1/yiyan` 随机返回一句一言，支持标准 JSON、纯文本、Markdown、JavaScript 和 JSONP。

## 请求参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `type` | `a` | `a` 动画、`b` 漫画、`c` 游戏、`d` 文学、`e` 原创、`f` 影视、`g` 诗词、`h` 哲学、`i` v50 文案、`n` 其他、`z` 网络 |
| `encode` | `json` | `json`、`text`、`js` 或 `md` |
| `charset` | `utf-8` | `utf-8` 或 `gbk` |
| `callback` | 空 | 合法 JavaScript 标识符；存在时返回 JSONP，优先于 `encode` |
| `select` | `.yiyan` | `encode=js` 时写入句子的 CSS 选择器 |
| `min_length` / `max_length` | `0` / `30` | 句子长度范围，`min_length` 不能大于 `max_length` |
| `id` | 空 | 指定复合 ID，例如 `a1`；找不到时返回 404 |

JSON（默认）返回标准响应壳，`data` 结构如下：

```json
{
  "id": "a1",
  "yiyan": "示例句子",
  "type": "a",
  "from": "作品名",
  "from_who": "作者",
  "created_at": "2026-08-06",
  "length": 4
}
```

`text` 只返回句子文本；`md` 返回引用块；`js` 返回将句子写入 `select` 匹配元素的同步脚本。`callback` 返回包裹标准响应壳的 JSONP，`charset=gbk` 不可与 JSONP 同时使用。

接口每次随机选择并设置 `cache-control: no-store`。参数错误返回 `400 INVALID_PARAMETER`，没有符合条件的句子返回 `404 YIYAN_NOT_FOUND`。
