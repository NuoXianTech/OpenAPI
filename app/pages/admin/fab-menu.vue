<script lang="ts" setup>
import type { FabMenuItem, FabMenuActionType } from '~/composables/fab-menu/types'

definePageMeta({ middleware: 'auth-admin' })

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
  const res = await $fetch<{ code: number, msg: string, data: FabMenuItem[] }>('/api/admin/fab-menu/list')
  items.value = res.data || []
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

  if (form.id) {
    await $fetch('/api/admin/fab-menu/update', { method: 'PUT', body: payload })
  }
  else {
    await $fetch('/api/admin/fab-menu/add', { method: 'POST', body: payload })
  }

  notice.value = 'FAB 菜单已保存'
  reset()
  await load()
}

const remove = async (id: number) => {
  await $fetch('/api/admin/fab-menu/delete', { method: 'POST', body: { id } })
  if (form.id === id) {
    reset()
  }
  await load()
}

onMounted(load)
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
              FAB 菜单管理
            </h1>
            <p class="auth-subtitle">
              管理首页右下角的快速导航按钮与弹层内容。
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

        <div class="grid gap-4">
          <div class="grid gap-3 border border-border rounded-[14px] p-4 bg-card">
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input
                v-model="form.title"
                class="auth-input"
                placeholder="标题"
              >
              <input
                v-model="form.subtitle"
                class="auth-input"
                placeholder="副标题"
              >
              <input
                v-model="form.icon"
                class="auth-input"
                placeholder="图标，例如 mdi:clipboard-text-multiple"
              >
              <select
                v-model="form.actionType"
                class="auth-input"
              >
                <option
                  v-for="option in actionTypeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <input
                v-model="form.actionValue"
                class="auth-input"
                placeholder="动作地址 / 路由 / iframe 地址"
              >
              <input
                v-model="form.actionLabel"
                class="auth-input"
                placeholder="右侧提示文案，例如 打开 / 加群"
              >
              <select
                v-model="form.target"
                class="auth-input"
              >
                <option value="_blank">
                  新标签页
                </option>
                <option value="_self">
                  当前页面
                </option>
              </select>
              <input
                v-model.number="form.sort"
                type="number"
                class="auth-input"
                placeholder="排序，数字越小越靠前"
              >
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="form.isActive"
                type="checkbox"
              > 启用
            </label>
            <div class="auth-actions">
              <button
                class="auth-button"
                @click="save"
              >
                保存 FAB 菜单
              </button>
              <button
                class="auth-button auth-ghost"
                @click="reset"
              >
                重置
              </button>
            </div>
          </div>

          <TransitionGroup
            tag="div"
            name="api-card"
            class="grid gap-2 md:grid-cols-2 xl:grid-cols-3 api-card-grid"
            appear
          >
            <div
              v-for="item in items"
              :key="item.id"
              class="api-card-item p-3 rounded-[12px] border border-border bg-card"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm rounded-full px-2 py-0.5 border border-border bg-background text-muted-foreground shrink-0">
                    <Icon
                      :name="item.icon"
                      size="16"
                    />
                  </span>
                  <div class="min-w-0">
                    <div class="font-semibold truncate">
                      {{ item.title }}
                    </div>
                    <div class="text-xs text-muted-foreground truncate">
                      {{ item.subtitle || item.actionValue }}
                    </div>
                  </div>
                </div>
                <span class="text-[11px] px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground">
                  {{ item.actionType }}
                </span>
              </div>

              <div class="text-xs text-muted-foreground mt-2 break-all">
                {{ item.actionValue }}
              </div>

              <div class="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
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

              <div class="auth-actions mt-2">
                <button
                  class="auth-button auth-ghost"
                  @click="pick(item)"
                >
                  编辑
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="remove(item.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>FAB Menu</h3>
        <p>统一管理首页右下角快速导航，支持外链、站内路由与 iframe 弹层。</p>
        <div class="auth-chip">
          Manage FAB Items
        </div>
      </div>
    </div>
  </div>
</template>
