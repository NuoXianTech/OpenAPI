<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })

interface UserItem {
  id: number
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  isActive: boolean
  isBanned: boolean
  lastLoginAt: string | null
  lastLoginIp: string | null
  createdAt: string
  updatedAt: string | null
}

interface ApiKeyItem {
  id: number
  name: string
  apiKey: string
  isActive: boolean
  createdAt: string
}

const users = ref<UserItem[]>([])
const apiKeys = ref<ApiKeyItem[]>([])
const selectedUserId = ref(0)
const keyword = ref('')
const notice = ref('')

const form = reactive({
  id: 0,
  username: '',
  email: '',
  displayName: '',
  avatarUrl: '',
  isActive: true,
  isBanned: false,
})

const keyName = ref('')

const loadUsers = async () => {
  const res = await $fetch<{ code: number, msg: string, data: UserItem[] }>('/api/admin/users/list', {
    query: keyword.value ? { keyword: keyword.value } : {},
  })
  users.value = res.data || []
  if (!selectedUserId.value && users.value[0]) {
    selectedUserId.value = users.value[0].id
  }
}

const loadApiKeys = async () => {
  if (!selectedUserId.value) return
  const res = await $fetch<{ code: number, msg: string, data: ApiKeyItem[] }>('/api/admin/users/apikeys', {
    query: { userId: selectedUserId.value },
  })
  apiKeys.value = res.data || []
}

watch(selectedUserId, loadApiKeys)

const pickUser = (user: UserItem) => {
  selectedUserId.value = user.id
  Object.assign(form, {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || '',
    avatarUrl: user.avatarUrl || '',
    isActive: user.isActive,
    isBanned: user.isBanned,
  })
}

const saveUser = async () => {
  await $fetch('/api/admin/users/update', { method: 'PUT', body: form })
  notice.value = '用户已更新'
  await loadUsers()
}

const deleteUser = async (id: number) => {
  await $fetch('/api/admin/users/delete', { method: 'POST', body: { id } })
  notice.value = '用户已删除'
  await loadUsers()
}

const toggleBan = async (user: UserItem) => {
  await $fetch('/api/admin/users/ban', { method: 'POST', body: { id: user.id, isBanned: !user.isBanned } })
  await loadUsers()
}

const createApiKey = async () => {
  await $fetch('/api/admin/users/apikeys/add', {
    method: 'POST',
    body: { userId: selectedUserId.value, name: keyName.value || '默认密钥' },
  })
  keyName.value = ''
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

onMounted(async () => {
  await loadUsers()
  await loadApiKeys()
})
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(1180px, 96vw);"
      >
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 class="auth-title">
              用户管理
            </h1>
            <p class="auth-subtitle">
              编辑用户、封禁用户，并管理该用户的 API Key。
            </p>
          </div>
          <NuxtLink
            class="auth-button auth-ghost"
            to="/admin"
          >返回控制台</NuxtLink>
        </div>

        <div
          v-if="notice"
          class="text-sm text-muted-foreground mb-3"
        >
          {{ notice }}
        </div>

        <div class="grid gap-3 md:grid-cols-[320px_1fr]">
          <div class="grid gap-3">
            <input
              v-model="keyword"
              class="auth-input"
              placeholder="搜索用户名/邮箱"
            >
            <button
              class="auth-button"
              @click="loadUsers"
            >
              搜索
            </button>
            <div class="grid gap-2 max-h-[520px] overflow-auto pr-1">
              <button
                v-for="user in users"
                :key="user.id"
                class="text-left p-3 rounded-[12px] border border-border bg-white hover:bg-bg"
                @click="pickUser(user)"
              >
                <div class="font-semibold">
                  {{ user.username }}
                </div>
                <div class="text-xs text-muted-foreground">
                  {{ user.email }}
                </div>
                <div class="text-xs text-muted-foreground">
                  激活: {{ user.isActive ? '是' : '否' }} / 封禁: {{ user.isBanned ? '是' : '否' }}
                </div>
              </button>
            </div>
          </div>

          <div class="grid gap-4">
            <div class="grid gap-3 border border-border rounded-[14px] p-4 bg-white">
              <div class="font-semibold">
                编辑用户
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <input
                  v-model="form.username"
                  class="auth-input"
                  placeholder="用户名"
                >
                <input
                  v-model="form.email"
                  class="auth-input"
                  placeholder="邮箱"
                >
                <input
                  v-model="form.displayName"
                  class="auth-input"
                  placeholder="显示名称"
                >
                <input
                  v-model="form.avatarUrl"
                  class="auth-input"
                  placeholder="头像 URL"
                >
              </div>
              <div class="grid gap-2 md:grid-cols-2">
                <label class="flex items-center gap-2 text-sm"><input
                  v-model="form.isActive"
                  type="checkbox"
                > 激活</label>
                <label class="flex items-center gap-2 text-sm"><input
                  v-model="form.isBanned"
                  type="checkbox"
                > 封禁</label>
              </div>
              <div class="auth-actions">
                <button
                  class="auth-button"
                  @click="saveUser"
                >
                  保存用户
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="deleteUser(form.id)"
                >
                  删除用户
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="toggleBan(form as UserItem)"
                >
                  切换封禁
                </button>
              </div>
            </div>

            <div class="grid gap-3 border border-border rounded-[14px] p-4 bg-white">
              <div class="font-semibold">
                用户 API Key
              </div>
              <div class="grid gap-2 md:grid-cols-[1fr_auto]">
                <input
                  v-model="keyName"
                  class="auth-input"
                  placeholder="新密钥名称"
                >
                <button
                  class="auth-button"
                  @click="createApiKey"
                >
                  新增密钥
                </button>
              </div>
              <div class="grid gap-2">
                <div
                  v-for="item in apiKeys"
                  :key="item.id"
                  class="p-3 rounded-[12px] border border-border"
                >
                  <div class="font-semibold">
                    {{ item.name }}
                  </div>
                  <div class="text-xs text-muted-foreground break-all">
                    {{ item.apiKey }}
                  </div>
                  <div class="auth-actions mt-2">
                    <button
                      class="auth-button auth-ghost"
                      @click="resetApiKey(item.id)"
                    >
                      重置
                    </button>
                    <button
                      class="auth-button auth-ghost"
                      @click="deleteApiKey(item.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>User Admin</h3>
        <p>这里是用户管理模块，和其他模块分开维护。</p>
        <div class="auth-chip">
          Users · Keys · Session
        </div>
      </div>
    </div>
  </div>
</template>
