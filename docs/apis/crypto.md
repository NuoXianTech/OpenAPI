# 加密与解密公共接口

Crypto 使用同一个路径完成算法发现和文本处理：

- `GET /v1/crypto`：查看可用算法和最小调用示例。
- `POST /v1/crypto`：执行编码、解码、加密或解密。

## 最简单调用

```bash
curl -X POST 'http://127.0.0.1:3000/v1/crypto' \
  -H 'Content-Type: application/json' \
  -d '{"algorithm":"base64","action":"encode","input":"Hello"}'
```

```json
{
  "algorithm": "base64",
  "action": "encode",
  "input": "Hello"
}
```

字段含义：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `algorithm` | 是 | 算法编码，通过 `GET /v1/crypto` 查看 |
| `action` | 是 | `encode` 表示编码或加密，`decode` 表示解码或解密 |
| `input` | 是 | 需要处理的内容 |
| `key` | 否 | 密钥；`emoji-aes` 和 `rc4` 必填 |
| `options` | 否 | 少数算法使用的高级选项 |

成功响应只返回处理结果：

```json
{
  "code": "OK",
  "message": "处理成功",
  "data": {
    "result": "SGVsbG8="
  },
  "timestamp": 1700000000000
}
```

## 使用密钥

```json
{
  "algorithm": "rc4",
  "action": "encode",
  "input": "Hello",
  "key": "your-secret"
}
```

## 高级选项

大多数算法不需要 `options`。需要自定义凯撒密码的移动距离时才传入：

```json
{
  "algorithm": "caesar",
  "action": "encode",
  "input": "Hello",
  "options": {
    "shift": 3
  }
}
```

未知的高级选项会被拒绝，避免参数拼写错误被静默忽略。

## 算法清单

GET 清单只保留算法编码、名称、通俗说明、密钥要求和最小示例：

```json
{
  "algorithm": "caesar",
  "name": "凯撒密码",
  "description": "按指定距离移动英文字母，也可以反向还原。",
  "keyRequired": false,
  "example": {
    "algorithm": "caesar",
    "action": "encode",
    "input": "Hello"
  }
}
```

算法内部使用的参数 schema、加密格式和实现细节不会出现在公共清单中。
