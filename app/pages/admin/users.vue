<script lang="ts" setup>
import { toast } from 'vue-sonner'

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

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
    pickUser(current || users.value[0])
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载用户失败')
    notice.value = message
    toast.error(message)
  }
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
    toast.error(message)
  }
}

watch(selectedUserId, () => {
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
    toast.success(notice.value)
    await loadUsers()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '更新用户失败')
    notice.value = message
    toast.error(message)
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
    toast.success(notice.value)
    await loadUsers()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除用户失败')
    notice.value = message
    toast.error(message)
  }
}

const toggleBan = async (user: UserItem) => {
  try {
    await $fetch('/api/admin/users/ban', { method: 'POST', body: { id: user.id, isBanned: !user.isBanned } })
    notice.value = user.isBanned ? '用户已解封' : '用户已封禁'
    toast.success(notice.value)
    await loadUsers()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '切换封禁失败')
    notice.value = message
    toast.error(message)
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
    toast.success('API Key 已新增')
    await loadApiKeys()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '新增密钥失败')
    notice.value = message
    toast.error(message)
  }
}

const deleteApiKey = async (id: number) => {
  try {
    await $fetch('/api/admin/users/apikeys/delete', { method: 'POST', body: { id } })
    toast.success('API Key 已删除')
    await loadApiKeys()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除密钥失败')
    notice.value = message
    toast.error(message)
  }
}

const resetApiKey = async (id: number) => {
  try {
    await $fetch('/api/admin/users/apikeys/reset', { method: 'POST', body: { id } })
    toast.success('API Key 已重置')
    await loadApiKeys()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '重置密钥失败')
    notice.value = message
    toast.error(message)
  }
}

onMounted(async () => {
  await loadUsers()
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
          <div class="flex items-center gap-2">
            <Badge variant="secondary">
              {{ users.length }} Users
            </Badge>
            <Button
              as-child
              variant="outline"
            >
              <NuxtLink to="/admin">
                返回控制台
              </NuxtLink>
            </Button>
          </div>
        </div>

        <div
          v-if="notice"
          class="mb-3"
        >
          <Badge variant="outline">
            {{ notice }}
          </Badge>
        </div>

        <div class="grid gap-3 md:grid-cols-[320px_1fr]">
          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                用户列表
              </CardTitle>
              <CardDescription>
                按用户名或邮箱搜索
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3">
              <div class="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  v-model="keyword"
                  placeholder="搜索用户名/邮箱"
                  @keydown.enter.prevent="loadUsers"
                />
                <Button @click="loadUsers">
                  搜索
                </Button>
              </div>

              <Empty
                v-if="!users.length"
                class="border border-dashed border-border bg-background/60"
              >
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Icon
                      name="mdi:account-search"
                      class="size-5"
                    />
                  </EmptyMedia>
                  <EmptyTitle>暂无用户</EmptyTitle>
                  <EmptyDescription>
                    当前筛选条件下没有可管理的用户。
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>

              <ScrollArea
                v-else
                class="max-h-[540px] pr-2"
              >
                <div class="grid gap-2">
                  <button
                    v-for="user in users"
                    :key="user.id"
                    type="button"
                    class="w-full rounded-[12px] border border-border bg-background/80 p-3 text-left transition-colors hover:bg-accent"
                    :class="selectedUserId === user.id ? 'border-primary/40 bg-accent' : ''"
                    @click="pickUser(user)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <div class="truncate font-semibold">
                          {{ user.username }}
                        </div>
                        <div class="truncate text-xs text-muted-foreground">
                          {{ user.email }}
                        </div>
                      </div>
                      <Badge :variant="user.isBanned ? 'destructive' : 'outline'">
                        {{ user.isBanned ? '封禁' : '正常' }}
                      </Badge>
                    </div>
                  </button>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div class="grid gap-4">
            <Card class="border-border/70 bg-card/90 shadow-sm">
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  编辑用户
                </CardTitle>
                <CardDescription>
                  {{ selectedUser ? `用户 ID: ${selectedUser.id}` : '请先从左侧选择用户' }}
                </CardDescription>
              </CardHeader>
              <CardContent class="grid gap-4">
                <div class="grid gap-3 md:grid-cols-2">
                  <div class="grid gap-2">
                    <Label for="username">
                      用户名
                    </Label>
                    <Input
                      id="username"
                      v-model="form.username"
                      placeholder="用户名"
                      :disabled="!form.id"
                    />
                  </div>

                  <div class="grid gap-2">
                    <Label for="email">
                      邮箱
                    </Label>
                    <Input
                      id="email"
                      v-model="form.email"
                      placeholder="邮箱"
                      :disabled="!form.id"
                    />
                  </div>

                  <div class="grid gap-2">
                    <Label for="displayName">
                      显示名称
                    </Label>
                    <Input
                      id="displayName"
                      v-model="form.displayName"
                      placeholder="显示名称"
                      :disabled="!form.id"
                    />
                  </div>

                  <div class="grid gap-2">
                    <Label for="avatarUrl">
                      头像 URL
                    </Label>
                    <Input
                      id="avatarUrl"
                      v-model="form.avatarUrl"
                      placeholder="头像 URL"
                      :disabled="!form.id"
                    />
                  </div>
                </div>

                <div class="grid gap-3 md:grid-cols-2">
                  <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
                    <div>
                      <div class="text-sm font-medium">
                        账号激活
                      </div>
                      <div class="text-xs text-muted-foreground">
                        未激活用户无法正常登录
                      </div>
                    </div>
                    <Switch
                      v-model="form.isActive"
                      :disabled="!form.id"
                    />
                  </div>

                  <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
                    <div>
                      <div class="text-sm font-medium">
                        用户封禁
                      </div>
                      <div class="text-xs text-muted-foreground">
                        封禁后用户将无法调用 API
                      </div>
                    </div>
                    <Switch
                      v-model="form.isBanned"
                      :disabled="!form.id"
                    />
                  </div>
                </div>

                <div class="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <div class="rounded-md border border-border bg-background p-3">
                    最后登录时间：{{ formatDate(selectedUser?.lastLoginAt || null) }}
                  </div>
                  <div class="rounded-md border border-border bg-background p-3">
                    最后登录 IP：{{ selectedUser?.lastLoginIp || '暂无' }}
                  </div>
                </div>

                <Separator />

                <div class="flex flex-wrap gap-2">
                  <Button
                    :disabled="!form.id"
                    @click="saveUser"
                  >
                    保存用户
                  </Button>

                  <Button
                    variant="outline"
                    :disabled="!form.id"
                    @click="toggleBan(form as UserItem)"
                  >
                    {{ form.isBanned ? '解除封禁' : '封禁用户' }}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger as-child>
                      <Button
                        variant="destructive"
                        :disabled="!form.id"
                      >
                        删除用户
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除该用户？</AlertDialogTitle>
                        <AlertDialogDescription>
                          删除后该用户关联数据将不可恢复。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          class="bg-destructive text-white hover:bg-destructive/90"
                          @click="deleteUser(form.id)"
                        >
                          确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>

            <Card class="border-border/70 bg-card/90 shadow-sm">
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  用户 API Key
                </CardTitle>
                <CardDescription>
                  当前用户：{{ selectedUser?.username || '未选择' }}
                </CardDescription>
              </CardHeader>
              <CardContent class="grid gap-3">
                <div class="grid gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    v-model="keyName"
                    placeholder="新密钥名称"
                    :disabled="!selectedUserId"
                    @keydown.enter.prevent="createApiKey"
                  />
                  <Button
                    :disabled="!selectedUserId"
                    @click="createApiKey"
                  >
                    新增密钥
                  </Button>
                </div>

                <Empty
                  v-if="!selectedUserId"
                  class="border border-dashed border-border bg-background/60"
                >
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Icon
                        name="mdi:account-arrow-left-outline"
                        class="size-5"
                      />
                    </EmptyMedia>
                    <EmptyTitle>请先选择用户</EmptyTitle>
                    <EmptyDescription>
                      选择用户后即可管理对应 API Key。
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>

                <Empty
                  v-else-if="!apiKeys.length"
                  class="border border-dashed border-border bg-background/60"
                >
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Icon
                        name="mdi:key-plus"
                        class="size-5"
                      />
                    </EmptyMedia>
                    <EmptyTitle>暂无 API Key</EmptyTitle>
                    <EmptyDescription>
                      当前用户还没有创建任何密钥。
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>

                <div
                  v-else
                  class="rounded-md border"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead class="w-[180px]">
                          名称
                        </TableHead>
                        <TableHead>
                          Key
                        </TableHead>
                        <TableHead class="w-[220px] text-right">
                          操作
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="item in apiKeys"
                        :key="item.id"
                      >
                        <TableCell class="font-medium">
                          {{ item.name }}
                        </TableCell>
                        <TableCell class="max-w-[420px] truncate text-xs text-muted-foreground">
                          {{ item.apiKey }}
                        </TableCell>
                        <TableCell>
                          <div class="flex justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger as-child>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  重置
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认重置密钥？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    重置后旧 Key 将失效。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction @click="resetApiKey(item.id)">
                                    确认重置
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger as-child>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                >
                                  删除
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>确认删除密钥？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    删除后需要重新创建才可使用。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>取消</AlertDialogCancel>
                                  <AlertDialogAction
                                    class="bg-destructive text-white hover:bg-destructive/90"
                                    @click="deleteApiKey(item.id)"
                                  >
                                    确认删除
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
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
