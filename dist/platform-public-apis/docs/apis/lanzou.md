# 蓝奏云链接解析公共接口

`GET /v1/lanzou` 解析单个蓝奏云文件分享链接，支持公开文件和带分享密码的文件。不支持文件夹。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `url` | 是 | - | 蓝奏云 HTTPS 文件分享链接 |
| `pwd` | 否 | - | 文件的分享密码 |
| `type` | 否 | - | 设为 `down` 时返回 302 并跳转到上游下载地址 |

```bash
# 解析公开文件
curl 'http://127.0.0.1:3000/v1/lanzou?url=https%3A%2F%2Fwww.lanzouq.com%2FiGNHA6th9cd'

# 解析带密码文件
curl 'http://127.0.0.1:3000/v1/lanzou?url=https%3A%2F%2Fwww.lanzous.com%2Fi42Xxebssfg&pwd=1234'

# 直接跳转
curl -I 'http://127.0.0.1:3000/v1/lanzou?url=https%3A%2F%2Fwww.lanzouq.com%2FiGNHA6th9cd&type=down'
```

## JSON 响应

```json
{
  "code": "OK",
  "message": "蓝奏云链接解析成功",
  "data": {
    "name": "头像.txt",
    "size": "30.2 K",
    "url": "https://developer2.lanrar.com/file/example"
  },
  "timestamp": 1786090000000
}
```

响应包含短期有效的上游下载地址，因此始终设置 `Cache-Control: no-store`。`type=down` 只重定向，不通过本服务代理文件内容；上游仍可能要求浏览器完成下载验证。

## 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 400 | `MISSING_URL` | 缺少 `url`。 |
| 400 | `INVALID_URL` | 链接格式、协议、域名或文件 ID 无效。 |
| 400 | `PASSWORD_REQUIRED` | 文件需要分享密码。 |
| 422 | `UNSUPPORTED_RESOURCE` | 分享链接指向文件夹。 |
| 422 | `SHARE_UNAVAILABLE` | 文件不存在、失效或已取消分享。 |
| 422 | `INVALID_PASSWORD` | 分享密码不正确。 |
| 422 | `PARSE_FAILED` | 上游页面结构变化或未返回下载地址。 |
| 502 | `UPSTREAM_ERROR` | 请求蓝奏云服务失败。 |
| 502 | `UPSTREAM_INVALID_RESPONSE` | 上游返回无效 JSON、超大内容或不可信下载地址。 |

实现参考了仓库内的 `dist/api/LanzouAPI`（MIT License），但已按当前项目的响应规范和服务端请求安全要求重新实现。接口不会关闭 TLS 验证、伪造客户端 IP，也不会请求调用方指定的任意主机。
