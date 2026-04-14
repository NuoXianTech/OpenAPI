<script lang="ts" setup>
import type { FabMenuActionType, FabMenuItem } from '~/composables/fab-menu/types'

interface FabMenuForm {
  id: number
  title: string
  subtitle: string
  icon: string
  actionType: FabMenuActionType
  actionValue: string
  actionLabel: string
  target: string
  sort: number
  isActive: boolean
}

const actionTypeOptions: Array<{ label: string, value: FabMenuActionType }> = [
  { label: '外链', value: 'link' },
  { label: '站内路由', value: 'route' },
  { label: '内嵌 iframe', value: 'iframe' },
]

const items = ref<FabMenuItem[]>([])
const notice = ref('')
const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const toast = useToast()
const notifySuccess = (message: string) => toast.add({ title: message, color: 'success' })
const notifyError = (message: string) => toast.add({ title: message, color: 'error' })

const form = reactive<FabMenuForm>({
  id: 0,
  title: '',
  subtitle: '',
  icon: 'mdi:link-variant',
  actionType: 'link',
  actionValue: '',
  actionLabel: '打开',
  target: '_blank',
  sort: 0,
  isActive: true,
})

const load = async () => {
  try {
    const res = await $fetch<{ code: number, msg: string, data: FabMenuItem[] }>('/api/admin/fab-menu/list')
    items.value = res.data || []
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载 FAB 菜单失败')
    notice.value = message
    notifyError(message)
  }
}

const pick = (item: FabMenuItem) => {
  Object.assign(form, {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle || '',
    icon: item.icon,
    actionType: item.actionType,
    actionValue: item.actionValue,
    actionLabel: item.actionLabel,
    target: item.target,
    sort: item.sort,
    isActive: item.isActive,
  })
}

const reset = () => {
  Object.assign(form, {
    id: 0,
    title: '',
    subtitle: '',
    icon: 'mdi:link-variant',
    actionType: 'link',
    actionValue: '',
    actionLabel: '打开',
    target: '_blank',
    sort: 0,
    isActive: true,
  })
}

const save = async () => {
  const payload = {
    ...form,
    subtitle: form.subtitle.trim() || null,
  }

  try {
    if (form.id) {
      await $fetch('/api/admin/fab-menu/update', { method: 'PUT', body: payload })
    }
    else {
      await $fetch('/api/admin/fab-menu/add', { method: 'POST', body: payload })
    }

    notice.value = 'FAB 菜单已保存'
    notifySuccess(notice.value)
    reset()
    await load()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '保存 FAB 菜单失败')
    notice.value = message
    notifyError(message)
  }
}

const remove = async (id: number) => {
  try {
    await $fetch('/api/admin/fab-menu/delete', { method: 'POST', body: { id } })
    if (form.id === id) {
      reset()
    }
    notifySuccess('FAB 菜单已删除')
    await load()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除 FAB 菜单失败')
    notice.value = message
    notifyError(message)
  }
}

const confirmRemove = (id: number) => {
  if (globalThis.confirm('确认删除该 FAB 菜单项？删除后前台入口将立即消失。')) {
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
          FAB 菜单管理
        </h1>
        <p class="auth-subtitle">
          管理首页右下角的快速导航按钮与弹层内容。
        </p>
      </div>
      <UBadge
        color="neutral"
        variant="soft"
      >
        {{ items.length }} Items
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
      <UCard class="border-border/70 bg-card/90 shadow-sm">
        <div class="pb-3">
          <h3 class="text-base">
            {{ form.id ? '编辑 FAB 菜单项' : '新增 FAB 菜单项' }}
          </h3>
          <p>
            支持外链、站内路由和 iframe 三种动作类型。
          </p>
        </div>
        <div class="grid gap-3">
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div class="grid gap-2">
              <label for="fab-title">
                标题
              </label>
              <UInput
                id="fab-title"
                v-model="form.title"
                placeholder="标题"
              />
            </div>

            <div class="grid gap-2">
              <label for="fab-subtitle">
                副标题
              </label>
              <UInput
                id="fab-subtitle"
                v-model="form.subtitle"
                placeholder="副标题"
              />
            </div>

            <div class="grid gap-2">
              <label for="fab-icon">
                图标
              </label>
              <UInput
                id="fab-icon"
                v-model="form.icon"
                placeholder="例如 mdi:clipboard-text-multiple"
              />
            </div>

            <div class="grid gap-2">
              <label>
                动作类型
              </label>
              <select
                v-model="form.actionType"
                class="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option
                  v-for="option in actionTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="grid gap-2">
              <label for="fab-action-value">
                动作地址
              </label>
              <UInput
                id="fab-action-value"
                v-model="form.actionValue"
                placeholder="动作地址 / 路由 / iframe 地址"
              />
            </div>

            <div class="grid gap-2">
              <label for="fab-action-label">
                动作文案
              </label>
              <UInput
                id="fab-action-label"
                v-model="form.actionLabel"
                placeholder="例如 打开 / 加群"
              />
            </div>

            <div class="grid gap-2">
              <label>
                打开方式
              </label>
              <select
                v-model="form.target"
                class="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="_blank">
                  新标签页
                </option>
                <option value="_self">
                  当前页面
                </option>
              </select>
            </div>

            <div class="grid gap-2">
              <label for="fab-sort">
                排序
              </label>
              <UInput
                id="fab-sort"
                v-model.number="form.sort"
                type="number"
                placeholder="数字越小越靠前"
              />
            </div>
          </div>

          <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
            <div>
              <div class="text-sm font-medium">
                启用状态
              </div>
              <div class="text-xs text-muted-foreground">
                关闭后前台不会显示该按钮
              </div>
            </div>
            <USwitch v-model="form.isActive" />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton @click="save">
              {{ form.id ? '更新 FAB 菜单' : '保存 FAB 菜单' }}
            </UButton>
            <UButton
              variant="outline"
              @click="reset"
            >
              重置
            </UButton>
          </div>
        </div>
      </UCard>

      <TransitionGroup
        tag="div"
        name="api-card"
        class="grid gap-2 md:grid-cols-2 xl:grid-cols-3 api-card-grid"
        appear
      >
        <UCard
          v-for="item in items"
          :key="item.id"
          class="api-card-item border-border/70 bg-card/90 shadow-sm"
        >
          <div class="pb-3">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm rounded-full px-2 py-0.5 border border-border bg-background text-muted-foreground shrink-0">
                  <Icon
                    :name="item.icon"
                    size="16"
                  />
                </span>
                <div class="min-w-0">
                  <h3 class="truncate text-base">
                    {{ item.title }}
                  </h3>
                  <p class="truncate">
                    {{ item.subtitle || item.actionValue }}
                  </p>
                </div>
              </div>
              <UBadge variant="outline">
                {{ item.actionType }}
              </UBadge>
            </div>
          </div>

          <div class="grid gap-3">
            <div class="text-xs text-muted-foreground break-all">
              {{ item.actionValue }}
            </div>

            <div class="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span class="px-2 py-0.5 rounded-full border border-border bg-background">
                {{ item.actionLabel }}
              </span>
              <span class="px-2 py-0.5 rounded-full border border-border bg-background">
                {{ item.target }}
              </span>
              <span class="px-2 py-0.5 rounded-full border border-border bg-background">
                sort: {{ item.sort }}
              </span>
              <span class="px-2 py-0.5 rounded-full border border-border bg-background">
                {{ item.isActive ? '启用' : '停用' }}
              </span>
            </div>

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
      </TransitionGroup>
    </div>
  </div>
</template>
