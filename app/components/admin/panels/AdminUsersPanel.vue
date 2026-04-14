<script lang="ts" setup>
interface UserItem {
  id: number
  username: string
  email: string
  displayName: string | null
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
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')
const banFilter = ref<'all' | 'normal' | 'banned'>('all')
const userPageSize = ref(10)
const userCurrentPage = ref(1)
const apiKeyKeyword = ref('')
const apiKeyStatusFilter = ref<'all' | 'active' | 'inactive'>('all')
const apiKeyPageSize = ref(10)
const apiKeyCurrentPage = ref(1)

const userPageSizeOptions = [10, 20, 50]
const apiKeyPageSizeOptions = [10, 20, 50]

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const toast = useToast()
const notifySuccess = (message: string) => toast.add({ title: message, color: 'success' })
const notifyError = (message: string) => toast.add({ title: message, color: 'error' })

const resetForm = () => {
  Object.assign(form, {
    id: 0,
    username: '',
    email: '',
    displayName: '',
    avatarUrl: '',
    isActive: true,
    isBanned: false,
  })
}

const selectedUser = computed(() => users.value.find(user => user.id === selectedUserId.value) || null)

const filteredUsers = computed(() => {
  return users.value.filter((user) => {
    const activeMatched = activeFilter.value === 'all'
      || (activeFilter.value === 'active' ? user.isActive : !user.isActive)

    const banMatched = banFilter.value === 'all'
      || (banFilter.value === 'banned' ? user.isBanned : !user.isBanned)

    return activeMatched && banMatched
  })
})

const userTotalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredUsers.value.length / userPageSize.value))
})

const pagedUsers = computed(() => {
  const start = (userCurrentPage.value - 1) * userPageSize.value
  return filteredUsers.value.slice(start, start + userPageSize.value)
})

const userPageRangeText = computed(() => {
  if (!filteredUsers.value.length) {
    return '0-0'
  }
  const start = (userCurrentPage.value - 1) * userPageSize.value + 1
  const end = Math.min(userCurrentPage.value * userPageSize.value, filteredUsers.value.length)
  return `${start}-${end}`
})

const filteredApiKeys = computed(() => {
  const keywordLower = apiKeyKeyword.value.trim().toLowerCase()

  return apiKeys.value.filter((item) => {
    const statusMatched = apiKeyStatusFilter.value === 'all'
      || (apiKeyStatusFilter.value === 'active' ? item.isActive : !item.isActive)

    const keywordMatched = !keywordLower
      || item.name.toLowerCase().includes(keywordLower)
      || item.apiKey.toLowerCase().includes(keywordLower)

    return statusMatched && keywordMatched
  })
})

const apiKeyTotalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredApiKeys.value.length / apiKeyPageSize.value))
})

const pagedApiKeys = computed(() => {
  const start = (apiKeyCurrentPage.value - 1) * apiKeyPageSize.value
  return filteredApiKeys.value.slice(start, start + apiKeyPageSize.value)
})

const apiKeyPageRangeText = computed(() => {
  if (!filteredApiKeys.value.length) {
    return '0-0'
  }
  const start = (apiKeyCurrentPage.value - 1) * apiKeyPageSize.value + 1
  const end = Math.min(apiKeyCurrentPage.value * apiKeyPageSize.value, filteredApiKeys.value.length)
  return `${start}-${end}`
})

const formatDate = (value: string | null) => {
  if (!value) {
    return '暂无'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadUsers = async () => {
  try {
    const res = await $fetch<{ code: number, msg: string, data: UserItem[] }>('/api/admin/users/list', {
      query: keyword.value ? { keyword: keyword.value } : {},
    })
    users.value = res.data || []

    if (!users.value.length) {
      selectedUserId.value = 0
      apiKeys.value = []
      resetForm()
      return
    }

    const current = users.value.find(user => user.id === selectedUserId.value)
    const nextUser = current || users.value[0]
    if (!nextUser) {
      return
    }
    pickUser(nextUser)
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载用户失败')
    notice.value = message
    notifyError(message)
  }
}

watch([activeFilter, banFilter, userPageSize], () => {
  userCurrentPage.value = 1
})

watch(userTotalPages, (value) => {
  if (userCurrentPage.value > value) {
    userCurrentPage.value = value
  }
})

watch([apiKeyKeyword, apiKeyStatusFilter, apiKeyPageSize], () => {
  apiKeyCurrentPage.value = 1
})

watch(apiKeyTotalPages, (value) => {
  if (apiKeyCurrentPage.value > value) {
    apiKeyCurrentPage.value = value
  }
})

const goPrevUserPage = () => {
  userCurrentPage.value = Math.max(1, userCurrentPage.value - 1)
}

const goNextUserPage = () => {
  userCurrentPage.value = Math.min(userTotalPages.value, userCurrentPage.value + 1)
}

const resetUserFilters = async () => {
  keyword.value = ''
  activeFilter.value = 'all'
  banFilter.value = 'all'
  userPageSize.value = 10
  userCurrentPage.value = 1
  await loadUsers()
}

const goPrevApiKeyPage = () => {
  apiKeyCurrentPage.value = Math.max(1, apiKeyCurrentPage.value - 1)
}

const goNextApiKeyPage = () => {
  apiKeyCurrentPage.value = Math.min(apiKeyTotalPages.value, apiKeyCurrentPage.value + 1)
}

const resetApiKeyFilters = () => {
  apiKeyKeyword.value = ''
  apiKeyStatusFilter.value = 'all'
  apiKeyPageSize.value = 10
  apiKeyCurrentPage.value = 1
}

const loadApiKeys = async () => {
  if (!selectedUserId.value) return
  try {
    const res = await $fetch<{ code: number, msg: string, data: ApiKeyItem[] }>('/api/admin/users/apikeys', {
      query: { userId: selectedUserId.value },
    })
    apiKeys.value = res.data || []
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载密钥失败')
    notice.value = message
    notifyError(message)
  }
}

watch(selectedUserId, () => {
  apiKeyKeyword.value = ''
  apiKeyStatusFilter.value = 'all'
  apiKeyPageSize.value = 10
  apiKeyCurrentPage.value = 1
  void loadApiKeys()
})

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
  if (!form.id) {
    notice.value = '请先选择用户'
    return
  }

  try {
    await $fetch('/api/admin/users/update', { method: 'PUT', body: form })
    notice.value = '用户已更新'
    notifySuccess(notice.value)
    await loadUsers()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '更新用户失败')
    notice.value = message
    notifyError(message)
  }
}

const deleteUser = async (id: number) => {
  if (!id) {
    notice.value = '请先选择用户'
    return
  }

  try {
    await $fetch('/api/admin/users/delete', { method: 'POST', body: { id } })
    notice.value = '用户已删除'
    notifySuccess(notice.value)
    await loadUsers()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除用户失败')
    notice.value = message
    notifyError(message)
  }
}

const confirmDeleteUser = () => {
  if (!form.id) {
    return
  }
  if (globalThis.confirm('确认删除该用户？删除后关联数据将不可恢复。')) {
    void deleteUser(form.id)
  }
}

const toggleBan = async (user: UserItem) => {
  try {
    await $fetch('/api/admin/users/ban', { method: 'POST', body: { id: user.id, isBanned: !user.isBanned } })
    notice.value = user.isBanned ? '用户已解封' : '用户已封禁'
    notifySuccess(notice.value)
    await loadUsers()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '切换封禁失败')
    notice.value = message
    notifyError(message)
  }
}

const createApiKey = async () => {
  if (!selectedUserId.value) {
    notice.value = '请先选择用户'
    return
  }

  try {
    await $fetch('/api/admin/users/apikeys/add', {
      method: 'POST',
      body: { userId: selectedUserId.value, name: keyName.value || '默认密钥' },
    })
    keyName.value = ''
    notifySuccess('API Key 已新增')
    await loadApiKeys()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '新增密钥失败')
    notice.value = message
    notifyError(message)
  }
}

const deleteApiKey = async (id: number) => {
  try {
    await $fetch('/api/admin/users/apikeys/delete', { method: 'POST', body: { id } })
    notifySuccess('API Key 已删除')
    await loadApiKeys()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除密钥失败')
    notice.value = message
    notifyError(message)
  }
}

const resetApiKey = async (id: number) => {
  try {
    await $fetch('/api/admin/users/apikeys/reset', { method: 'POST', body: { id } })
    notifySuccess('API Key 已重置')
    await loadApiKeys()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '重置密钥失败')
    notice.value = message
    notifyError(message)
  }
}

const confirmResetApiKey = (id: number) => {
  if (globalThis.confirm('确认重置密钥？重置后旧 Key 将失效。')) {
    void resetApiKey(id)
  }
}

const confirmDeleteApiKey = (id: number) => {
  if (globalThis.confirm('确认删除密钥？删除后需要重新创建才可使用。')) {
    void deleteApiKey(id)
  }
}

const copyApiKey = async (value: string) => {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      throw new Error('当前环境不支持复制')
    }
    await navigator.clipboard.writeText(value)
    notifySuccess('API Key 已复制')
  }
  catch (error: unknown) {
    notifyError(getErrorMessage(error, '复制失败'))
  }
}

onMounted(async () => {
  await loadUsers()
})
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="auth-title">
          用户管理
        </h1>
        <p class="auth-subtitle">
          编辑用户、封禁用户，并管理该用户的 API Key。
        </p>
      </div>
      <UBadge
        color="neutral"
        variant="soft"
      >
        {{ filteredUsers.length }} / {{ users.length }} Users
      </UBadge>
    </div>

    <div
      v-if="notice"
      class="mb-3"
    >
      <UBadge variant="outline">
        {{ notice }}
      </UBadge>
    </div>

    <div class="grid gap-3 md:grid-cols-[320px_1fr]">
      <UCard class="border-default/70 bg-elevated/90 shadow-sm">
        <div class="pb-3">
          <h3 class="text-base">
            用户列表
          </h3>
          <p>
            按用户名或邮箱搜索
          </p>
        </div>
        <div class="grid gap-3">
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <UInput
              v-model="keyword"
              placeholder="搜索用户名/邮箱"
              @keydown.enter.prevent="loadUsers"
            />
            <UButton @click="loadUsers">
              搜索
            </UButton>
          </div>

          <div class="grid gap-2 md:grid-cols-3">
            <select
              v-model="activeFilter"
              class="h-9 rounded-md border border-default bg-default px-3 text-sm"
            >
              <option value="all">
                全部激活状态
              </option>
              <option value="active">
                已激活
              </option>
              <option value="inactive">
                未激活
              </option>
            </select>

            <select
              v-model="banFilter"
              class="h-9 rounded-md border border-default bg-default px-3 text-sm"
            >
              <option value="all">
                全部封禁状态
              </option>
              <option value="normal">
                正常
              </option>
              <option value="banned">
                已封禁
              </option>
            </select>

            <select
              v-model.number="userPageSize"
              class="h-9 rounded-md border border-default bg-default px-3 text-sm"
            >
              <option
                v-for="size in userPageSizeOptions"
                :key="size"
                :value="size"
              >
                每页 {{ size }} 条
              </option>
            </select>
          </div>

          <div class="flex items-center justify-between gap-2 text-xs text-muted">
            <span>共 {{ filteredUsers.length }} 条，当前显示 {{ userPageRangeText }}</span>
            <UButton
              variant="ghost"
              size="sm"
              @click="resetUserFilters"
            >
              重置筛选
            </UButton>
          </div>

          <UEmpty
            v-if="!filteredUsers.length"
            class="border border-dashed border-default bg-default/60"
          >
            <div>
              <div>
                <Icon
                  name="mdi:account-search"
                  class="size-5"
                />
              </div>
              <h3>暂无用户</h3>
              <p>
                当前筛选条件下没有可管理的用户。
              </p>
            </div>
          </UEmpty>

          <UScrollArea
            v-else
            class="max-h-[540px] pr-2"
          >
            <div class="grid gap-2">
              <button
                v-for="user in pagedUsers"
                :key="user.id"
                type="button"
                class="w-full rounded-[12px] border border-default bg-default/80 p-3 text-left transition-colors hover:bg-accented"
                :class="selectedUserId === user.id ? 'border-primary/40 bg-accented' : ''"
                @click="pickUser(user)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="truncate font-semibold">
                      {{ user.username }}
                    </div>
                    <div class="truncate text-xs text-muted">
                      {{ user.email }}
                    </div>
                  </div>
                  <UBadge
                    variant="outline"
                    :color="user.isBanned ? 'error' : 'neutral'"
                  >
                    {{ user.isBanned ? '封禁' : '正常' }}
                  </UBadge>
                </div>
              </button>
            </div>
          </UScrollArea>

          <div
            v-if="filteredUsers.length"
            class="flex items-center justify-between gap-2 text-xs text-muted"
          >
            <span>第 {{ userCurrentPage }} / {{ userTotalPages }} 页</span>
            <div class="flex flex-wrap gap-2">
              <UButton
                variant="outline"
                size="sm"
                :disabled="userCurrentPage === 1"
                @click="userCurrentPage = 1"
              >
                首页
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                :disabled="userCurrentPage === 1"
                @click="goPrevUserPage"
              >
                上一页
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                :disabled="userCurrentPage >= userTotalPages"
                @click="goNextUserPage"
              >
                下一页
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                :disabled="userCurrentPage >= userTotalPages"
                @click="userCurrentPage = userTotalPages"
              >
                末页
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <div class="grid gap-4">
        <UCard class="border-default/70 bg-elevated/90 shadow-sm">
          <div class="pb-3">
            <h3 class="text-base">
              编辑用户
            </h3>
            <p>
              {{ selectedUser ? `用户 ID: ${selectedUser.id}` : '请先从左侧选择用户' }}
            </p>
          </div>
          <div class="grid gap-4">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="grid gap-2">
                <label for="username">
                  用户名
                </label>
                <UInput
                  id="username"
                  v-model="form.username"
                  placeholder="用户名"
                  :disabled="!form.id"
                />
              </div>

              <div class="grid gap-2">
                <label for="email">
                  邮箱
                </label>
                <UInput
                  id="email"
                  v-model="form.email"
                  placeholder="邮箱"
                  :disabled="!form.id"
                />
              </div>

              <div class="grid gap-2">
                <label for="displayName">
                  显示名称
                </label>
                <UInput
                  id="displayName"
                  v-model="form.displayName"
                  placeholder="显示名称"
                  :disabled="!form.id"
                />
              </div>

              <div class="grid gap-2">
                <label for="avatarUrl">
                  头像 URL
                </label>
                <UInput
                  id="avatarUrl"
                  v-model="form.avatarUrl"
                  placeholder="头像 URL"
                  :disabled="!form.id"
                />
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="flex items-center justify-between rounded-md border border-default bg-default p-3">
                <div>
                  <div class="text-sm font-medium">
                    账号激活
                  </div>
                  <div class="text-xs text-muted">
                    未激活用户无法正常登录
                  </div>
                </div>
                <USwitch
                  v-model="form.isActive"
                  :disabled="!form.id"
                />
              </div>

              <div class="flex items-center justify-between rounded-md border border-default bg-default p-3">
                <div>
                  <div class="text-sm font-medium">
                    用户封禁
                  </div>
                  <div class="text-xs text-muted">
                    封禁后用户将无法调用 API
                  </div>
                </div>
                <USwitch
                  v-model="form.isBanned"
                  :disabled="!form.id"
                />
              </div>
            </div>

            <div class="grid gap-2 text-xs text-muted md:grid-cols-2">
              <div class="rounded-md border border-default bg-default p-3">
                最后登录时间：{{ formatDate(selectedUser?.lastLoginAt || null) }}
              </div>
              <div class="rounded-md border border-default bg-default p-3">
                最后登录 IP：{{ selectedUser?.lastLoginIp || '暂无' }}
              </div>
            </div>

            <USeparator />

            <div class="flex flex-wrap gap-2">
              <UButton
                :disabled="!form.id"
                @click="saveUser"
              >
                保存用户
              </UButton>

              <UButton
                variant="outline"
                :disabled="!form.id"
                @click="toggleBan(form as UserItem)"
              >
                {{ form.isBanned ? '解除封禁' : '封禁用户' }}
              </UButton>

              <UButton
                color="error"
                :disabled="!form.id"
                @click="confirmDeleteUser"
              >
                删除用户
              </UButton>
            </div>
          </div>
        </UCard>

        <UCard class="border-default/70 bg-elevated/90 shadow-sm">
          <div class="pb-3">
            <h3 class="text-base">
              用户 API Key
            </h3>
            <p>
              当前用户：{{ selectedUser?.username || '未选择' }}
            </p>
          </div>
          <div class="grid gap-3">
            <div class="grid gap-2 md:grid-cols-[1fr_auto]">
              <UInput
                v-model="keyName"
                placeholder="新密钥名称"
                :disabled="!selectedUserId"
                @keydown.enter.prevent="createApiKey"
              />
              <UButton
                :disabled="!selectedUserId"
                @click="createApiKey"
              >
                新增密钥
              </UButton>
            </div>

            <div class="grid gap-2 md:grid-cols-3">
              <UInput
                v-model="apiKeyKeyword"
                placeholder="搜索密钥名称或 Key"
                :disabled="!selectedUserId"
              />

              <select
                v-model="apiKeyStatusFilter"
                class="h-9 rounded-md border border-default bg-default px-3 text-sm"
                :disabled="!selectedUserId"
              >
                <option value="all">
                  全部状态
                </option>
                <option value="active">
                  已启用
                </option>
                <option value="inactive">
                  未启用
                </option>
              </select>

              <select
                v-model.number="apiKeyPageSize"
                class="h-9 rounded-md border border-default bg-default px-3 text-sm"
                :disabled="!selectedUserId"
              >
                <option
                  v-for="size in apiKeyPageSizeOptions"
                  :key="size"
                  :value="size"
                >
                  每页 {{ size }} 条
                </option>
              </select>
            </div>

            <div
              v-if="selectedUserId"
              class="flex items-center justify-between gap-2 text-xs text-muted"
            >
              <span>共 {{ filteredApiKeys.length }} 条，当前显示 {{ apiKeyPageRangeText }}</span>
              <UButton
                variant="ghost"
                size="sm"
                @click="resetApiKeyFilters"
              >
                重置筛选
              </UButton>
            </div>

            <UEmpty
              v-if="!selectedUserId"
              class="border border-dashed border-default bg-default/60"
            >
              <div>
                <div>
                  <Icon
                    name="mdi:account-arrow-left-outline"
                    class="size-5"
                  />
                </div>
                <h3>请先选择用户</h3>
                <p>
                  选择用户后即可管理对应 API Key。
                </p>
              </div>
            </UEmpty>

            <UEmpty
              v-else-if="!apiKeys.length"
              class="border border-dashed border-default bg-default/60"
            >
              <div>
                <div>
                  <Icon
                    name="mdi:key-plus"
                    class="size-5"
                  />
                </div>
                <h3>暂无 API Key</h3>
                <p>
                  当前用户还没有创建任何密钥。
                </p>
              </div>
            </UEmpty>

            <UEmpty
              v-else-if="!filteredApiKeys.length"
              class="border border-dashed border-default bg-default/60"
            >
              <div>
                <div>
                  <Icon
                    name="mdi:key-chain"
                    class="size-5"
                  />
                </div>
                <h3>没有匹配的密钥</h3>
                <p>
                  当前筛选条件下没有可展示的 API Key。
                </p>
              </div>
            </UEmpty>

            <div
              v-else
              class="rounded-md border"
            >
              <table>
                <thead>
                  <tr>
                    <th class="w-[160px]">
                      名称
                    </th>
                    <th>
                      Key
                    </th>
                    <th class="w-[90px]">
                      状态
                    </th>
                    <th class="w-[170px]">
                      创建时间
                    </th>
                    <th class="w-[300px] text-right">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in pagedApiKeys"
                    :key="item.id"
                  >
                    <td class="font-medium">
                      {{ item.name }}
                    </td>
                    <td class="max-w-[420px] truncate text-xs text-muted">
                      {{ item.apiKey }}
                    </td>
                    <td>
                      <UBadge
                        variant="outline"
                        :color="item.isActive ? 'success' : 'neutral'"
                      >
                        {{ item.isActive ? '启用' : '停用' }}
                      </UBadge>
                    </td>
                    <td class="text-xs text-muted">
                      {{ formatDate(item.createdAt) }}
                    </td>
                    <td>
                      <div class="flex justify-end gap-2">
                        <UButton
                          variant="outline"
                          size="sm"
                          @click="copyApiKey(item.apiKey)"
                        >
                          复制
                        </UButton>

                        <UButton
                          variant="outline"
                          size="sm"
                          @click="confirmResetApiKey(item.id)"
                        >
                          重置
                        </UButton>

                        <UButton
                          color="error"
                          size="sm"
                          @click="confirmDeleteApiKey(item.id)"
                        >
                          删除
                        </UButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="flex items-center justify-between border-t px-4 py-3">
                <p class="text-xs text-muted">
                  第 {{ apiKeyCurrentPage }} / {{ apiKeyTotalPages }} 页
                </p>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="apiKeyCurrentPage === 1"
                    @click="apiKeyCurrentPage = 1"
                  >
                    首页
                  </UButton>
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="apiKeyCurrentPage === 1"
                    @click="goPrevApiKeyPage"
                  >
                    上一页
                  </UButton>
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="apiKeyCurrentPage >= apiKeyTotalPages"
                    @click="goNextApiKeyPage"
                  >
                    下一页
                  </UButton>
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="apiKeyCurrentPage >= apiKeyTotalPages"
                    @click="apiKeyCurrentPage = apiKeyTotalPages"
                  >
                    末页
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
