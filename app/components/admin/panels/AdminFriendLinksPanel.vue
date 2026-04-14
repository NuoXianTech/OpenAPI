<script lang="ts" setup>
interface FriendLinkItem {
  id: number
  title: string
  url: string
  description: string | null
  isActive: boolean
}

const items = ref<FriendLinkItem[]>([])
const notice = ref('')
const form = reactive({ id: 0, title: '', url: '', description: '', isActive: true })

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
  Object.assign(form, { id: 0, title: '', url: '', description: '', isActive: true })
}

const load = async () => {
  try {
    const res = await $fetch<{ code: number, msg: string, data: FriendLinkItem[] }>('/api/admin/friend-links/list')
    items.value = res.data || []
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载友情链接失败')
    notice.value = message
    notifyError(message)
  }
}

const pick = (item: FriendLinkItem) => Object.assign(form, item)

const save = async () => {
  try {
    if (form.id) {
      await $fetch('/api/admin/friend-links/update', { method: 'PUT', body: form })
    }
    else {
      await $fetch('/api/admin/friend-links/add', { method: 'POST', body: form })
    }
    notice.value = '友情链接已保存'
    notifySuccess(notice.value)
    resetForm()
    await load()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '保存友情链接失败')
    notice.value = message
    notifyError(message)
  }
}

const remove = async (id: number) => {
  try {
    await $fetch('/api/admin/friend-links/delete', { method: 'POST', body: { id } })
    notifySuccess('友情链接已删除')
    if (form.id === id) {
      resetForm()
    }
    await load()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除友情链接失败')
    notice.value = message
    notifyError(message)
  }
}

const confirmRemove = (id: number) => {
  if (globalThis.confirm('确认删除该友情链接？删除后不会在前台展示且无法恢复。')) {
    void remove(id)
  }
}

onMounted(load)
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="auth-title">
          友情链接管理
        </h1>
        <p class="auth-subtitle">
          新增、编辑、删除友情链接。
        </p>
      </div>
      <UBadge
        color="neutral"
        variant="soft"
      >
        {{ items.length }} Links
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

    <div class="grid gap-4">
      <UCard class="border-default/70 bg-elevated/90 shadow-sm">
        <div class="pb-3">
          <h3 class="text-base">
            {{ form.id ? '编辑友情链接' : '新增友情链接' }}
          </h3>
          <p>
            支持启停控制，标题和链接为必填项。
          </p>
        </div>
        <div class="grid gap-3">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="grid gap-2">
              <label for="link-title">
                标题
              </label>
              <UInput
                id="link-title"
                v-model="form.title"
                placeholder="标题"
              />
            </div>
            <div class="grid gap-2">
              <label for="link-url">
                链接地址
              </label>
              <UInput
                id="link-url"
                v-model="form.url"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div class="grid gap-2">
            <label for="link-description">
              描述
            </label>
            <UTextarea
              id="link-description"
              v-model="form.description"
              placeholder="友情链接描述（可选）"
              class="min-h-[88px]"
            />
          </div>

          <div class="flex items-center justify-between rounded-md border border-default bg-default p-3">
            <div>
              <div class="text-sm font-medium">
                启用状态
              </div>
              <div class="text-xs text-muted">
                关闭后前台不展示该链接
              </div>
            </div>
            <USwitch v-model="form.isActive" />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton @click="save">
              {{ form.id ? '更新友情链接' : '保存友情链接' }}
            </UButton>
            <UButton
              variant="outline"
              @click="resetForm"
            >
              重置
            </UButton>
          </div>
        </div>
      </UCard>

      <UEmpty
        v-if="!items.length"
        class="border border-dashed border-default bg-default/60"
      >
        <div>
          <div>
            <Icon
              name="mdi:link-off"
              class="size-5"
            />
          </div>
          <h3>暂无友情链接</h3>
          <p>
            保存上方表单后会自动出现在这里。
          </p>
        </div>
      </UEmpty>

      <div
        v-else
        class="grid gap-2 md:grid-cols-2 xl:grid-cols-3"
      >
        <UCard
          v-for="item in items"
          :key="item.id"
          class="border-default/70 bg-elevated/90 shadow-sm"
        >
          <div class="pb-3">
            <div class="flex items-start justify-between gap-2">
              <h3 class="line-clamp-1 text-base">
                {{ item.title }}
              </h3>
              <UBadge
                variant="outline"
                :color="item.isActive ? 'success' : 'neutral'"
              >
                {{ item.isActive ? '启用' : '停用' }}
              </UBadge>
            </div>
            <p class="break-all">
              {{ item.url }}
            </p>
          </div>
          <div class="grid gap-3">
            <p class="text-sm text-muted line-clamp-2">
              {{ item.description || '暂无描述' }}
            </p>
            <div class="flex gap-2">
              <UButton
                variant="outline"
                size="sm"
                @click="pick(item)"
              >
                编辑
              </UButton>

              <UButton
                color="error"
                size="sm"
                @click="confirmRemove(item.id)"
              >
                删除
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
