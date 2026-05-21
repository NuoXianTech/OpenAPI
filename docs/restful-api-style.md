# RESTful API 设计风格指南

> 一份通用的 RESTful 接口设计参考，约束 URL、HTTP 方法、响应壳、状态码与版本控制。
> 项目内部的具体落地（manifest 扫描、计费、注册）见 [api-conventions.md](./api-conventions.md)；本文档关注**风格层面**的统一。

## 1. URL 设计

REST 把每个资源（resource）当作一个 URI，**用名词不用动词**，HTTP 方法承担"做什么"的语义。

### 1.1 资源命名

- 使用**复数名词**表示集合，单数也可但要全局统一：`/articles` 优于 `/article`
- 使用**小写 + 连字符** `-`，不要驼峰或下划线：`/user-profiles` 不是 `/userProfiles` / `/user_profiles`
- 不在 URL 里放动词：动作由 HTTP method 表达
- 嵌套资源用 `/` 体现归属关系，**层级一般不超过 2 层**

```
✅ GET    /articles                列出文章
✅ GET    /articles/1              查询 id=1 的文章
✅ POST   /articles                创建文章
✅ PUT    /articles/1              全量更新 id=1
✅ PATCH  /articles/1              局部更新 id=1
✅ DELETE /articles/1              删除 id=1
✅ GET    /articles/1/comments     id=1 文章下的评论集合
✅ POST   /articles/1/comments     给 id=1 文章新增评论

❌ GET    /getArticle?id=1
❌ POST   /addArticle
❌ PUT    /updateArticle
❌ DELETE /deleteArticle?id=1
❌ GET    /articles/1/comments/2/replies/3/likes   // 嵌套过深
```

### 1.2 查询参数（query string）

URL Path 表达**资源定位**，query 表达**过滤、排序、分页、字段裁剪**：

| 用途 | 推荐写法 |
| --- | --- |
| 过滤 | `GET /articles?status=published&author=zhangsan` |
| 排序 | `GET /articles?sort=-createdAt,title`（`-` 表示倒序） |
| 分页 | `GET /articles?page=2&pageSize=20` 或 `?offset=20&limit=20` |
| 字段裁剪 | `GET /articles/1?fields=id,title,author` |
| 搜索 | `GET /articles?q=keyword` |

## 2. HTTP 方法语义

| Method | 语义 | 幂等 | 安全 | 典型用法 |
| --- | --- | --- | --- | --- |
| `GET` | 读取 | ✅ | ✅ | 查询资源，**不得有副作用** |
| `POST` | 创建 | ❌ | ❌ | 新建子资源（id 由服务端生成） |
| `PUT` | 全量替换 | ✅ | ❌ | 客户端提供完整资源体覆盖 |
| `PATCH` | 局部更新 | ⚠️ | ❌ | 只传需要修改的字段 |
| `DELETE` | 删除 | ✅ | ❌ | 删除资源 |

- **幂等**：同样的请求多次发送，对服务器状态的影响与发一次相同
- **安全**：不修改服务器状态
- `PUT` 与 `PATCH` 的区别：`PUT /articles/1` 必须携带文章全部字段，未提供的字段会被置空；`PATCH` 只更新提供的字段

## 3. 响应格式

### 3.1 统一响应壳

无论成功还是失败，JSON 结构保持一致，前端按同一套逻辑解析：

```ts
{
  code: string       // 机器可读标识，大写 + 下划线（OK / CREATED / MISSING_API_KEY ...），详见第 4 节
  message: string    // 人类可读的提示信息
  data: T | null     // 业务数据，失败时为 null
  timestamp: number  // 服务端响应时间（Unix 秒或毫秒，全局统一）
}
```

`code` 与 HTTP status 分工：HTTP status 表达粗粒度（2xx 成功 / 4xx 客户端错 / 5xx 服务端错），body `code` 表达精确的机器可读子类型，便于同一 status 下区分多种原因（如 401 下的 `MISSING_API_KEY` / `INVALID_API_KEY` / `EXPIRED_API_KEY`）。

### 3.2 成功示例

```json
GET /v1/users/1   →   200 OK
{
  "code": "OK",
  "message": "ok",
  "data": { "id": 1, "name": "张三" },
  "timestamp": 1700000000
}
```

```json
POST /v1/articles   →   201 Created
{
  "code": "CREATED",
  "message": "created",
  "data": { "id": 42, "title": "Hello" },
  "timestamp": 1700000000
}
```

### 3.3 失败示例

```json
GET /v1/users/999   →   404 Not Found
{
  "code": "USER_NOT_FOUND",
  "message": "用户不存在",
  "data": null,
  "timestamp": 1700000000
}
```

```json
POST /v1/articles   →   400 Bad Request
{
  "code": "INVALID_REQUEST",
  "message": "title 不能为空",
  "data": null,
  "timestamp": 1700000000
}
```

### 3.4 列表响应

集合接口建议把分页元信息放进 `data`，避免污染外层壳：

```json
GET /v1/articles?page=1&pageSize=20   →   200 OK
{
  "code": "OK",
  "message": "ok",
  "data": {
    "items": [ /* ... */ ],
    "total": 137,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": 1700000000
}
```

## 4. HTTP 状态码

HTTP status 在响应行里准确表达请求结果的粗粒度类别，body `code` 给精确的机器可读子类型。两者各司其职、**都要正确填**。

### 4.1 2xx 成功

| 码 | 名称 | 用法 |
| --- | --- | --- |
| `200` | OK | 通用成功（GET / PUT / PATCH / DELETE） |
| `201` | Created | POST 创建资源成功，响应体返回新资源 |
| `204` | No Content | 操作成功但无返回体（如 DELETE） |

### 4.2 4xx 客户端错误

| 码 | 名称 | 用法 |
| --- | --- | --- |
| `400` | Bad Request | 参数缺失 / 格式非法 |
| `401` | Unauthorized | 未登录 / token 失效 |
| `403` | Forbidden | 已登录但无权限 |
| `404` | Not Found | 资源不存在 |
| `405` | Method Not Allowed | URL 存在但 method 不支持 |
| `409` | Conflict | 资源冲突（如重复创建、版本不匹配） |
| `422` | Unprocessable Entity | 参数语法正确但语义校验失败 |
| `429` | Too Many Requests | 限流触发 |

### 4.3 5xx 服务端错误

| 码 | 名称 | 用法 |
| --- | --- | --- |
| `500` | Internal Server Error | 兜底未捕获异常 |
| `502` | Bad Gateway | 上游服务返回错误 |
| `503` | Service Unavailable | 服务不可用（维护中 / 过载） |
| `504` | Gateway Timeout | 上游超时 |

### 4.4 body `code` 命名约定

- **大写 + 下划线**（SCREAMING_SNAKE_CASE）：`OK` / `CREATED` / `MISSING_API_KEY` / `UPSTREAM_TIMEOUT`，不要 camelCase 或纯小写
- **成功侧**：`200 → "OK"`、`201 → "CREATED"`、`204` 无 body 不涉及
- **失败侧**：用业务子类型，不直接照搬 HTTP status 名（即 `MISSING_API_KEY` 优于 `UNAUTHORIZED`）。同一 HTTP status 多种原因时**必须**用 `code` 区分
- **稳定性等同于公开契约**：`code` 是客户端用来做分支判断的字段，命名一旦发布就不要随便改；新增 code 不算破坏性变更，重命名 / 删除是
- **不冗余**：HTTP status 已经在响应行里，`code` 不要重复编码同样的信息（不写 `"400"` / `"HTTP_400"`）

## 5. 版本控制

接口一旦发布就要假设有人在用，**破坏性变更必须升版本号**。

### 5.1 URI 版本（推荐）

把版本号放在路径最前面，直观、可路由、可缓存：

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

### 5.2 Header 版本

URL 保持纯净，版本通过 Header 协商：

```http
GET /users HTTP/1.1
Host: api.example.com
Accept: application/vnd.example.v1+json
```

或自定义 Header：

```http
X-API-Version: 1
```

### 5.3 选型建议

| 维度 | URI 版本 | Header 版本 |
| --- | --- | --- |
| 可见性 | 直接看 URL 就知道 | 需要查 Header |
| 浏览器调试 | 友好 | 需要工具配合 |
| CDN 缓存 | 友好（路径不同自动隔离） | 需配置 vary |
| 资源同一性洁癖 | 不友好（同资源多 URI） | 友好 |

**没有特殊洁癖就用 URI 版本**，工程上更省心。

### 5.4 何时升版本

- ✅ 删除字段、改字段类型、改字段语义
- ✅ 修改鉴权方式、必填参数
- ✅ 改变 HTTP method 或 URL 结构
- ❌ 新增可选字段、新增 endpoint（向后兼容，原版本继续可用）

## 6. 设计检查清单

新加一个 endpoint 前，对照过一遍：

- [ ] URL 用名词复数，没有动词
- [ ] HTTP method 选对了（创建用 POST、全量改用 PUT、局部改用 PATCH）
- [ ] 响应壳是 `{ code, message, data, timestamp }`，没有裸 `{ id, name }`
- [ ] body `code` 用大写下划线字符串（`OK` / `MISSING_API_KEY` ...），失败时 `data` 为 `null`
- [ ] 成功返回正确的 2xx（创建用 201、无返回体用 204）
- [ ] 失败返回对应 4xx/5xx，`message` 给出可读提示；同 status 多子类型用 `code` 区分
- [ ] 列表接口包含 `total` / `page` / `pageSize`
- [ ] URL 带版本前缀 `/v{N}/`
- [ ] 破坏性改动升版本号，不在原版本上偷偷改
