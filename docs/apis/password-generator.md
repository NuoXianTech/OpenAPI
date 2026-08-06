# 随机密码生成公共接口

`GET /v1/password` 使用 Node.js 密码学安全随机数在本地生成密码，不请求上游服务。

## 请求

| Query 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `length` | 否 | `16` | 密码长度，必须是 `4-128` 之间的整数 |
| `mode` | 否 | `strong` | `strong`、`alphanumeric`、`numeric` |
| `encode` / `encoding` | 否 | `json` | `json`、`text`、`markdown`、`md` |

```bash
curl 'http://127.0.0.1:3000/v1/password'
curl 'http://127.0.0.1:3000/v1/password?length=24&mode=alphanumeric'
curl 'http://127.0.0.1:3000/v1/password?mode=numeric&length=8&encode=text'
```

模式说明：

- `strong`：小写字母、大写字母、数字和符号各至少一个。
- `alphanumeric`：小写字母、大写字母和数字各至少一个。
- `numeric`：只使用数字。

所有模式默认排除 `0/O/o`、`1/I/l` 等容易混淆的字符。

## JSON 数据

```json
{
  "code": "OK",
  "message": "随机密码生成成功",
  "data": {
    "password": "示例值仅用于说明，实际请求会随机生成",
    "length": 16,
    "mode": "strong",
    "character_types": [
      "lowercase",
      "uppercase",
      "numbers",
      "symbols"
    ],
    "entropy": 97.06,
    "strength": "极强",
    "ambiguous_characters_excluded": true
  },
  "timestamp": 1785590000000
}
```

`encode=text` 只返回密码本身；`encode=markdown` / `md` 返回便于阅读的 Markdown。

## 安全说明

- 使用 `node:crypto` 的 `randomInt` 取样，并用安全的 Fisher-Yates 算法洗牌，不使用 `Math.random()`。
- 响应设置 `Cache-Control: no-store`，服务端不缓存、也不主动记录生成的密码。
- 生产环境应通过 HTTPS 调用；生成后请使用可信密码管理器保存。
- 新接口被 manifest 自动发现后默认禁用，需在管理后台完成配置并启用。
