# QQ 头像公共接口

`GET /v1/qq-avatar` 获取指定 QQ 号的腾讯官方头像地址，支持 JSON 和图片模式。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `qq` | 是 | - | 5-12 位且不以 `0` 开头的 QQ 号 |
| `size` | 否 | `100` | `40`、`100`、`140` 或 `640` |
| `type` | 否 | `json` | `json` 或 `image` |

```bash
# 返回头像信息
curl 'http://127.0.0.1:3000/v1/qq-avatar?qq=10000&size=140'

# 获取图片（客户端会直接访问腾讯头像地址）
curl -L 'http://127.0.0.1:3000/v1/qq-avatar?qq=10000&size=640&type=image' -o qq-avatar.png
```

## JSON 响应

```json
{
  "code": "OK",
  "message": "获取 QQ 头像信息成功",
  "data": {
    "qq": "10000",
    "size": 140,
    "url": "https://q1.qlogo.cn/g?b=qq&nk=10000&s=140"
  },
  "timestamp": 1786100000000
}
```

## 输出与缓存

- `json` 返回标准公共接口响应壳。
- `image` 返回 302，客户端直接从 `q1.qlogo.cn` 获取头像，不消耗本服务的图片带宽。
- 成功响应允许客户端缓存 1 天。腾讯头像地址本身可能有更长的上游缓存时间，头像变更不会保证立即可见。

## 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 400 | `MISSING_QQ` | 缺少 `qq`。 |
| 400 | `INVALID_QQ` | QQ 号格式无效。 |
| 400 | `INVALID_SIZE` | `size` 不受支持。 |
| 400 | `INVALID_TYPE` | `type` 不受支持。 |
实现参考了仓库内的 `dist/api/qqimg`，并接入当前项目的统一响应规范。接口只生成固定的腾讯官方头像地址，不向用户提供任意跳转目标，也不通过当前服务器代理图片内容。
