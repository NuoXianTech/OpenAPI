# IP 归属地公共接口

`GET /v1/ip` 使用服务器本地的纯真 CZDB 数据库查询 IPv4 或 IPv6 归属地，不请求第三方在线接口，也不依赖 `czdb` npm 包。

## 请求参数

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `ip` | 否 | IPv4 或 IPv6；省略时使用平台按直连、Cloudflare 或 `X-Forwarded-For` 配置解析出的客户端 IP |

```bash
# 查询当前调用方 IP
curl 'http://127.0.0.1:3000/v1/ip'

# IPv4
curl 'http://127.0.0.1:3000/v1/ip?ip=8.8.8.8'

# IPv6
curl 'http://127.0.0.1:3000/v1/ip?ip=240e%3A391%3Aed3%3A8a10%3A%3A1'
```

`0.0.0.0`、`::` 和 IPv4-mapped IPv6 都会按合法 IP 解析；数据库没有对应记录时返回 `404 IP_NOT_FOUND`。

## 成功响应

```json
{
  "code": "OK",
  "message": "IP 归属地查询成功",
  "data": {
    "ip": "8.8.8.8",
    "ip_version": "ipv4",
    "country_name": "美国",
    "region_name": "加利福尼亚州",
    "city_name": "圣克拉拉",
    "district_name": "山景城",
    "internet_service_provider": "谷歌公司DNS服务器",
    "database_version": 20260325
  },
  "timestamp": 1785590000000
}
```

数据库缺少的层级返回 `null`，不会用空字符串或字符串 `"null"` 占位。响应设置 `Cache-Control: no-store`，避免省略 `ip` 时缓存其他调用方的地址结果。

## 数据库与密钥配置

从 [纯真社区版 IP 库](https://cz88.net/geo-public) 下载以下文件及其配套密钥：

- `cz88_public_v4.czdb`
- `cz88_public_v6.czdb`

数据库文件不属于项目源码或构建产物，不得提交到 Git。外挂文件统一按 `data/<接口标识>` 分类；本接口固定读取项目根目录下的：

```text
data/ip/cz88_public_v4.czdb
data/ip/cz88_public_v6.czdb
```

Git 仅忽略根目录下的 `data/ip`，不会屏蔽 `data` 中的其他文件或目录。Docker 内的对应路径为 `/app/data/ip`，建议把宿主机目录只读挂载到容器：

```bash
-v /var/lib/openapi/data/ip:/app/data/ip:ro
```

数据库密钥不使用环境变量。在管理后台进入“接口管理”，找到 `v1/ip`，打开“接口配置”并填写“CZDB 数据库密钥”。密钥沿用平台现有的敏感配置机制加密保存，后台不会回显；留空保存会保留已经配置的值。

修改密钥后无需重启。替换同名数据库文件后应重启 Node/Nitro 进程，让进程重新读取文件头和索引元数据。数据库过期、密钥错误、文件缺失或损坏时返回 `503 IP_DATABASE_UNAVAILABLE`；密钥尚未配置时返回 `503 IP_DATABASE_NOT_CONFIGURED`。

## 实现说明

- 只实现查询所需的 CZDB BTREE 读取和最小 MessagePack 解码，全部使用 Node.js 内置模块。
- 每次查询仅异步读取对应索引窗口和数据块，不把约 40MB 的 IPv4/IPv6 数据库整体载入内存。
- 文件路径固定在服务端外挂数据目录，密钥只从后台接口配置读取，调用方不能指定数据库文件或密钥。
- CZDB 文件及其数据授权以下载页面提供的条款为准；项目只包含兼容读取实现。
