# 今日运势公共接口

`GET /v1/luck` 随机返回一条今日运势，数据来源于 [vikiboss/60s](https://github.com/vikiboss/60s) 的本地运势数据集。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | 否 | 随机 | 运势类别 ID，支持 `0-18` |
| `encode` / `encoding` | 否 | `json` | `json`、`text`、`markdown` 或 `md` |

```bash
# 随机运势
curl 'http://127.0.0.1:3000/v1/luck'

# 指定类别
curl 'http://127.0.0.1:3000/v1/luck?id=7'

# Markdown 输出
curl 'http://127.0.0.1:3000/v1/luck?encoding=markdown'
```

类别 ID 依次为：`0` 人际运、`1` 整体运、`2` 学业运、`3` 财运、`4` 事业运、`5` 恋爱运、`6` 综合运、`7` 大吉、`8` 中吉、`9` 小吉、`10` 吉、`11` 半吉、`12` 末吉、`13` 末小吉、`14` 凶、`15` 小凶、`16` 半凶、`17` 末凶、`18` 大凶。

## JSON 响应

```json
{
  "code": "OK",
  "message": "获取今日运势成功",
  "data": {
    "id": 7,
    "category": "大吉",
    "rank": 10,
    "tip": "把握今天的新机会",
    "tip_index": 0
  },
  "timestamp": 1786100000000
}
```

`rank` 是数据集中的运势值，范围为 `-10` 到 `27`，不是十分制评分。`tip_index` 是提示在当前类别中的 0 基索引。

接口每次随机选择提示并设置 `cache-control: no-store`。格式错误的 `id` 返回 `400 INVALID_ID`，超出类别范围返回 `404 LUCK_NOT_FOUND`。
