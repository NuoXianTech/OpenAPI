<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })

interface UserItem {
  id: number
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
  isBanned: boolean
  lastLoginAt: string | null
  lastLoginIp: string
  createdAt: string
  updatedAt: string | null
}

interface ApiKeyItem {
  id: number
  userId: number
  name: string
  apiKey: string
  isActive: boolean
  createdAt: string
}

interface ApiItem {
  id: number
  code: string
  name: string
  status: number
  category: string | null
  shortDesc: string
  description: string
  version: string
  tags: string | null
  authType: string
  requestSchema: string | null
  responseSchema: string | null
  requestExample: string | null
  responseExample: string | null
  httpMethod: string
  apiPath: string
  docUrl: string
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  rateLimitPerMinute: number
  totalCalls: number
  successCalls: number
  failureCalls: number
}

interface FriendLinkItem {
  id: number
  title: string
  url: string
  description: string | null
  isActive: boolean
}

interface LogItem {
  id: number
  actor: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  ip: string | null
  detail: string | null
  createdAt: string
}

interface CallItem {
  id: number
  apiId: number
  apiKeyId: number | null
  userId: number | null
  path: string
  method: string
  statusCode: number
  statusSuccess: boolean
  latencyMs: number
  ip: string | null
  createdAt: string
}

const users = ref<UserItem[]>([])
const apiKeys = ref<ApiKeyItem[]>([])
const apis = ref<ApiItem[]>([])
const friendLinks = ref<FriendLinkItem[]>([])
const logs = ref<LogItem[]>([])
const calls = ref<CallItem[]>([])
const callStats = ref({ total: 0, success: 0, failure: 0 })
const loading = ref(false)
const notice = ref('')

const userForm = reactive({
  id: 0,
  username: '',
  email: '',
  displayName: '',
  avatarUrl: '',
  role: 'user',
  isActive: true,
  isBanned: false,
})
const apiKeyForm = reactive({ userId: 0, name: '' })
const apiForm = reactive({
  id: 0,
  code: '',
  name: '',
  status: 1,
  category: '',
  shortDesc: '',
  description: '',
  version: 'v1',
  tags: '',
  authType: 'none',
  requestSchema: '',
  responseSchema: '',
  requestExample: '',
  responseExample: '',
  httpMethod: 'GET',
  apiPath: '',
  docUrl: '',
  isEnabled: true,
  isApiKey: false,
  isStatistics: true,
  rateLimitPerMinute: 0,
})
const friendForm = reactive({
  id: 0,
  title: '',
  url: '',
  description: '',
  isActive: true,
})

const selectedUserId = ref(0)

const loadUsers = async () => {
  users.value = await $fetch<UserItem[]>('/api/admin/users/list')
  if (!selectedUserId.value && users.value[0]) {
    selectedUserId.value = users.value[0].id
  }
}

const loadApiKeys = async () => {
  if (!selectedUserId.value) return
  const res = await $fetch<{ code: number; msg: string; data: ApiKeyItem[] }>('/api/admin/users/apikeys', {
    query: { userId: selectedUserId.value },
  })
  apiKeys.value = res.data || []
}

const loadApis = async () => {
  apis.value = await $fetch<ApiItem[]>('/api/admin/apis/list')
}

const loadFriendLinks = async () => {
  friendLinks.value = await $fetch<FriendLinkItem[]>('/api/admin/friend-links/list')
}

const loadLogs = async () => {
  logs.value = await $fetch<LogItem[]>('/api/admin/logs/list')
}

const loadCalls = async () => {
  calls.value = await $fetch<CallItem[]>('/api/admin/calls/list')
  callStats.value = await $fetch<{ total: number; success: number; failure: number }>('/api/admin/calls/stats')
}

const loadAll = async () => {
  loading.value = true
  notice.value = ''
  try {
    await Promise.all([loadUsers(), loadApis(), loadFriendLinks(), loadLogs(), loadCalls()])
    await loadApiKeys()
  }
  catch (error: any) {
    notice.value = error?.message || '加载失败'
  }
  finally {
    loading.value = false
  }
}

watch(selectedUserId, async () => {
  await loadApiKeys()
})

const pickUser = (user: UserItem) => {
  Object.assign(userForm, {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || '',
    avatarUrl: user.avatarUrl || '',
    role: user.role,
    isActive: user.isActive,
    isBanned: user.isBanned,
  })
  selectedUserId.value = user.id
}

const saveUser = async () => {
  await $fetch('/api/admin/users/update', {
    method: 'PUT',
    body: userForm,
  })
  await loadUsers()
  notice.value = '用户已更新'
}

const deleteUser = async (id: number) => {
  await $fetch('/api/admin/users/delete', { method: 'POST', body: { id } })
  await loadUsers()
  notice.value = '用户已删除'
}

const toggleBan = async (user: UserItem) => {
  await $fetch('/api/admin/users/ban', { method: 'POST', body: { id: user.id, isBanned: !user.isBanned } })
  await loadUsers()
}

const addApiKey = async () => {
  await $fetch('/api/admin/users/apikeys/add', {
    method: 'POST',
    body: { userId: selectedUserId.value, name: apiKeyForm.name || '默认密钥' },
  })
  apiKeyForm.name = ''
  await loadApiKeys()
}

const deleteApiKey = async (id: number) => {
  await $fetch('/api/admin/users/apikeys/delete', { method: 'POST', body: { id } })
  await loadApiKeys()
}

const resetApiKey = async (id: number) => {
  await $fetch('/api/admin/users/apikeys/reset', { method: 'POST', body: { id } })
  await loadApiKeys()
}

const pickApi = (item: ApiItem) => {
  Object.assign(apiForm, item)
}

const saveApi = async () => {
  if (apiForm.id) {
    await $fetch('/api/admin/apis/update', { method: 'PUT', body: apiForm })
  }
  else {
    await $fetch('/api/admin/apis/add', { method: 'POST', body: apiForm })
  }
  await loadApis()
  notice.value = '接口已保存'
}

const toggleApi = async (item: ApiItem, field: 'isEnabled' | 'isStatistics') => {
  await $fetch('/api/admin/apis/toggle', {
    method: 'PUT',
    body: { id: item.id, field, value: !item[field] },
  })
  await loadApis()
}

const deleteApi = async (id: number) => {
  await $fetch('/api/admin/apis/delete', { method: 'POST', body: { id } })
  await loadApis()
}

const pickFriend = (item: FriendLinkItem) => {
  Object.assign(friendForm, item)
}

const saveFriend = async () => {
  if (friendForm.id) {
    await $fetch('/api/admin/friend-links/update', { method: 'PUT', body: friendForm })
  }
  else {
    await $fetch('/api/admin/friend-links/add', { method: 'POST', body: friendForm })
  }
  await loadFriendLinks()
}

const deleteFriend = async (id: number) => {
  await $fetch('/api/admin/friend-links/delete', { method: 'POST', body: { id } })
  await loadFriendLinks()
}

onMounted(loadAll)
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card" style="width:min(1180px, 96vw);">
        <h1 class="auth-title">管理员控制台</h1>
        <p class="auth-subtitle">用户管理、API Key 管理、友情链接、接口管理、操作日志和调用统计。</p>

        <div v-if="notice" class="mb-4 text-sm text-muted">{{ notice }}</div>
        <div v-if="loading" class="mb-4 text-sm text-muted">加载中...</div>

        <div class="grid gap-8">
          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-lg font-semibold">用户管理</h2>
              <button class="auth-button auth-ghost" @click="loadUsers">刷新</button>
            </div>
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div v-for="user in users" :key="user.id" class="p-3 rounded-[12px] border border-border bg-white">
                <div class="font-semibold">{{ user.username }}</div>
                <div class="text-xs text-muted">{{ user.email }}</div>
                <div class="text-xs text-muted mt-1">角色: {{ user.role }} / 激活: {{ user.isActive ? '是' : '否' }} / 封禁: {{ user.isBanned ? '是' : '否' }}</div>
                <div class="auth-actions mt-2">
                  <button class="auth-button auth-ghost" @click="pickUser(user)">编辑</button>
                  <button class="auth-button auth-ghost" @click="toggleBan(user)">{{ user.isBanned ? '解封' : '封禁' }}</button>
                  <button class="auth-button auth-ghost" @click="deleteUser(user.id)">删除</button>
                </div>
              </div>
            </div>

            <div class="grid gap-2 border border-border rounded-[14px] p-4 bg-white">
              <div class="font-semibold">编辑用户</div>
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <input v-model="userForm.username" class="auth-input" placeholder="用户名">
                <input v-model="userForm.email" class="auth-input" placeholder="邮箱">
                <input v-model="userForm.displayName" class="auth-input" placeholder="显示名称">
                <input v-model="userForm.avatarUrl" class="auth-input" placeholder="头像地址">
                <select v-model="userForm.role" class="auth-input">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <label class="flex items-center gap-2 text-sm px-2">
                  <input v-model="userForm.isActive" type="checkbox">
                  激活
                </label>
                <label class="flex items-center gap-2 text-sm px-2">
                  <input v-model="userForm.isBanned" type="checkbox">
                  封禁
                </label>
              </div>
              <div class="auth-actions">
                <button class="auth-button" @click="saveUser">保存用户</button>
              </div>
            </div>
          </section>

          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-lg font-semibold">用户 API Key 管理</h2>
              <button class="auth-button auth-ghost" @click="loadApiKeys">刷新</button>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <select v-model.number="selectedUserId" class="auth-input">
                <option v-for="user in users" :key="user.id" :value="user.id">{{ user.username }} ({{ user.email }})</option>
              </select>
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <input v-model="apiKeyForm.name" class="auth-input" placeholder="新 API Key 名称">
                <button class="auth-button" @click="addApiKey">创建</button>
              </div>
            </div>
            <div class="grid gap-2">
              <div v-for="item in apiKeys" :key="item.id" class="p-3 rounded-[12px] border border-border bg-white">
                <div class="font-semibold">{{ item.name }}</div>
                <div class="text-xs text-muted break-all">{{ item.apiKey }}</div>
                <div class="auth-actions mt-2">
                  <button class="auth-button auth-ghost" @click="resetApiKey(item.id)">重置</button>
                  <button class="auth-button auth-ghost" @click="deleteApiKey(item.id)">删除</button>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-lg font-semibold">友情链接管理</h2>
              <button class="auth-button auth-ghost" @click="loadFriendLinks">刷新</button>
            </div>
            <div class="grid gap-2 border border-border rounded-[14px] p-4 bg-white">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <input v-model="friendForm.title" class="auth-input" placeholder="标题">
                <input v-model="friendForm.url" class="auth-input" placeholder="链接地址">
                <input v-model="friendForm.description" class="auth-input" placeholder="描述">
                <label class="flex items-center gap-2 text-sm px-2">
                  <input v-model="friendForm.isActive" type="checkbox">
                  启用
                </label>
              </div>
              <div class="auth-actions">
                <button class="auth-button" @click="saveFriend">保存友情链接</button>
              </div>
            </div>
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div v-for="item in friendLinks" :key="item.id" class="p-3 rounded-[12px] border border-border bg-white">
                <div class="font-semibold">{{ item.title }}</div>
                <div class="text-xs text-muted break-all">{{ item.url }}</div>
                <div class="auth-actions mt-2">
                  <button class="auth-button auth-ghost" @click="pickFriend(item)">编辑</button>
                  <button class="auth-button auth-ghost" @click="deleteFriend(item.id)">删除</button>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-lg font-semibold">接口管理</h2>
              <button class="auth-button auth-ghost" @click="loadApis">刷新</button>
            </div>
            <div class="grid gap-3 border border-border rounded-[14px] p-4 bg-white">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <input v-model="apiForm.code" class="auth-input" placeholder="code">
                <input v-model="apiForm.name" class="auth-input" placeholder="name">
                <input v-model="apiForm.category" class="auth-input" placeholder="category">
                <input v-model="apiForm.shortDesc" class="auth-input" placeholder="short description">
                <input v-model="apiForm.version" class="auth-input" placeholder="version">
                <input v-model="apiForm.tags" class="auth-input" placeholder="tags">
                <select v-model="apiForm.status" class="auth-input">
                  <option :value="1">正常</option>
                  <option :value="0">异常</option>
                  <option :value="2">维护</option>
                  <option :value="3">废弃</option>
                </select>
                <select v-model="apiForm.authType" class="auth-input">
                  <option value="none">none</option>
                  <option value="apikey">apikey</option>
                  <option value="session">session</option>
                </select>
                <select v-model="apiForm.httpMethod" class="auth-input">
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <input v-model="apiForm.apiPath" class="auth-input" placeholder="/api/path">
                <input v-model="apiForm.docUrl" class="auth-input" placeholder="doc url">
                <input v-model.number="apiForm.rateLimitPerMinute" type="number" class="auth-input" placeholder="rate limit">
              </div>
              <textarea v-model="apiForm.description" class="auth-input min-h-[92px]" placeholder="description" />
              <textarea v-model="apiForm.requestSchema" class="auth-input min-h-[92px]" placeholder="request schema" />
              <textarea v-model="apiForm.responseSchema" class="auth-input min-h-[92px]" placeholder="response schema" />
              <div class="grid gap-2 md:grid-cols-3">
                <label class="flex items-center gap-2 text-sm px-2"><input v-model="apiForm.isEnabled" type="checkbox"> 启用</label>
                <label class="flex items-center gap-2 text-sm px-2"><input v-model="apiForm.isApiKey" type="checkbox"> 需要 API Key</label>
                <label class="flex items-center gap-2 text-sm px-2"><input v-model="apiForm.isStatistics" type="checkbox"> 开启统计</label>
              </div>
              <div class="auth-actions">
                <button class="auth-button" @click="saveApi">保存接口</button>
              </div>
            </div>
            <div class="grid gap-2">
              <div v-for="item in apis" :key="item.id" class="p-3 rounded-[12px] border border-border bg-white">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div class="font-semibold">{{ item.code }} · {{ item.name }}</div>
                    <div class="text-xs text-muted">{{ item.httpMethod }} {{ item.apiPath }} · {{ item.shortDesc }}</div>
                  </div>
                  <div class="text-xs text-muted">调用: {{ item.totalCalls }} / 成功: {{ item.successCalls }} / 失败: {{ item.failureCalls }}</div>
                </div>
                <div class="auth-actions mt-2">
                  <button class="auth-button auth-ghost" @click="pickApi(item)">编辑</button>
                  <button class="auth-button auth-ghost" @click="toggleApi(item, 'isEnabled')">{{ item.isEnabled ? '禁用' : '启用' }}</button>
                  <button class="auth-button auth-ghost" @click="toggleApi(item, 'isStatistics')">{{ item.isStatistics ? '停用统计' : '启用统计' }}</button>
                  <button class="auth-button auth-ghost" @click="deleteApi(item.id)">删除</button>
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-lg font-semibold">调用统计</h2>
              <div class="text-sm text-muted">总计 {{ callStats.total }} / 成功 {{ callStats.success }} / 失败 {{ callStats.failure }}</div>
              <button class="auth-button auth-ghost" @click="loadCalls">刷新</button>
            </div>
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div v-for="item in calls" :key="item.id" class="p-3 rounded-[12px] border border-border bg-white">
                <div class="font-semibold">API #{{ item.apiId }} · {{ item.method }}</div>
                <div class="text-xs text-muted break-all">{{ item.path }}</div>
                <div class="text-xs text-muted mt-1">状态: {{ item.statusCode }} / 耗时: {{ item.latencyMs }}ms / 成功: {{ item.statusSuccess ? '是' : '否' }}</div>
              </div>
            </div>
          </section>

          <section class="grid gap-3">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <h2 class="text-lg font-semibold">操作日志</h2>
              <button class="auth-button auth-ghost" @click="loadLogs">刷新</button>
            </div>
            <div class="grid gap-2">
              <div v-for="item in logs" :key="item.id" class="p-3 rounded-[12px] border border-border bg-white text-sm">
                <div class="font-semibold">{{ item.action }}</div>
                <div class="text-xs text-muted">{{ item.actor }} · {{ item.resourceType }} #{{ item.resourceId }} · {{ item.ip }}</div>
                <div class="text-xs text-muted break-all mt-1">{{ item.detail }}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Admin Console</h3>
        <p>这里可以管理用户、API Key、友情链接、接口与日志。</p>
        <div class="auth-chip">CRUD · Audit · Stats</div>
      </div>
    </div>
  </div>
</template>
