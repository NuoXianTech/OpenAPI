# Minecraft 玩家资料公共接口

`GET /v1/minecraft` 将玩家 UUID 查询与皮肤、披风查询合并为一个接口。参数 `id` 可以是 Minecraft Java 版用户名、32 位无连字符 UUID 或标准带连字符 UUID。

## 请求参数

| 参数 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `id` | 是 | - | Java 版玩家用户名或 UUID |
| `type` | 否 | `json` | `json` 返回完整资料；`skin`、`cape` 返回 302 纹理跳转 |

兼容参考实现中的 `skin_url` 和 `skin_cloak`，分别等价于 `skin` 和 `cape`。新调用建议使用简短值。

```bash
# 通过用户名查询完整资料
curl 'http://127.0.0.1:3000/v1/minecraft?id=Notch'

# UUID 可带或不带连字符
curl 'http://127.0.0.1:3000/v1/minecraft?id=069a79f4-44e9-4726-a5be-fca90e38aaf5'

# 跳转到皮肤纹理
curl -I 'http://127.0.0.1:3000/v1/minecraft?id=Notch&type=skin'
```

## JSON 响应

```json
{
  "code": "OK",
  "message": "获取 Minecraft 玩家资料成功",
  "data": {
    "name": "Notch",
    "uuid": "069a79f444e94726a5befca90e38aaf5",
    "texture_timestamp": 1786100000000,
    "skin": {
      "url": "https://textures.minecraft.net/texture/example",
      "model": "classic"
    },
    "cape": null
  },
  "timestamp": 1786100000000
}
```

`uuid` 始终返回 32 位小写无连字符形式。没有自定义皮肤或披风时，对应字段为 `null`；请求相应跳转类型时返回 `404 SKIN_NOT_FOUND` 或 `404 CAPE_NOT_FOUND`。

## 缓存与安全

解析结果通过项目共享缓存保存 5 分钟，成功响应允许客户端缓存 5 分钟。接口只请求 Mojang Profile API 和 Session Server，并将官方纹理地址统一升级到 HTTPS；跳转目标严格限制为 `textures.minecraft.net`。

## 错误

| HTTP | code | 说明 |
| --- | --- | --- |
| 400 | `MISSING_ID` | 缺少 `id`。 |
| 400 | `INVALID_ID` | 用户名或 UUID 格式无效。 |
| 400 | `INVALID_TYPE` | `type` 不受支持。 |
| 404 | `PLAYER_NOT_FOUND` | 玩家不存在。 |
| 404 | `SKIN_NOT_FOUND` | 玩家没有可用的皮肤纹理。 |
| 404 | `CAPE_NOT_FOUND` | 玩家没有可用的披风纹理。 |
| 502 | `UPSTREAM_ERROR` | Mojang 服务请求失败。 |
| 502 | `UPSTREAM_INVALID_RESPONSE` | Mojang 返回了无效或超大的数据。 |

实现参考了仓库内的 `dist/api/mcuuid` 与 `dist/api/mcskin`，并合并为一次完整资料查询。实现使用当前项目的统一响应、缓存和安全请求机制，不会关闭 TLS 验证或伪造客户端 IP。
