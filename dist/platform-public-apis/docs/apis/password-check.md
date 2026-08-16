# 密码强度检测公共接口

`POST /v1/password/check` 在本地分析密码的长度、字符类型、常见模式和估算强度，不请求上游服务。

## 请求

密码必须放在 JSON 请求体的 `password` 字段中，最多为 128 个 Unicode 码点。服务端不会对密码执行 `trim` 或 Unicode 归一化。

| Query 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `encode` / `encoding` | 否 | `json` | `json`、`text`、`markdown`、`md` |

```bash
# 仅使用示例密码，不要把真实账户密码写入 shell 历史
curl -X POST 'http://127.0.0.1:3000/v1/password/check' \
  -H 'Content-Type: application/json' \
  --data '{"password":"Example-Only-2026!"}'

curl -X POST 'http://127.0.0.1:3000/v1/password/check?encode=markdown' \
  -H 'Content-Type: application/json' \
  --data '{"password":"Example-Only-2026!"}'
```

## JSON 数据

```json
{
  "code": "OK",
  "message": "密码强度检测成功",
  "data": {
    "length": 18,
    "score": 94,
    "strength": "极强",
    "entropy": 118.3,
    "time_to_crack": "估算超过 100 万年",
    "character_analysis": {
      "has_lowercase": true,
      "has_uppercase": true,
      "has_numbers": true,
      "has_symbols": true,
      "has_other_letters": false,
      "has_repeated": false,
      "has_sequential": false,
      "is_common_password": false,
      "character_variety": 95,
      "unique_characters": 15
    },
    "recommendations": [
      "当前强度较好，仍请确保未在其他站点重复使用"
    ],
    "security_tips": [
      "不同站点使用不同的密码"
    ]
  },
  "timestamp": 1785590000000
}
```

响应不包含被检测的明文密码。`text` 和 `markdown` 输出同样只返回分析结果。

## 安全与评分说明

- 接口只接受 POST 请求体，避免密码进入 URL 和平台的 Query 调用日志。
- 所有响应都设置 `Cache-Control: no-store`，服务端不会回显、缓存或主动记录请求体。
- `entropy` 和 `time_to_crack` 是基于字符集与每秒 100 亿次离线猜测的粗略估算，不是破解时间保证。
- 该接口不查询密码泄露库，不能判断某个密码是否已在数据泄露中出现。
- 新接口被 manifest 自动发现后默认禁用，需在管理后台的接口管理中完成配置并启用。
