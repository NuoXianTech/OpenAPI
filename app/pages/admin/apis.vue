<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })

interface ApiItem {
  id: number
  apiId: string
  name: string
  status: number
  category: string | null
  shortDesc: string
  description: string
  httpMethod: string
  apiPath: string
  docUrl: string
  isEnabled: boolean
  isApiKey: boolean
  isStatistics: boolean
  rateLimitPerMinute: number
  totalCalls?: number
}

const methodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const apis = ref<ApiItem[]>([])
const notice = ref('')

const form = reactive({
  id: 0,
  apiId: '',
  name: '',
  status: 1,
  category: '',
  shortDesc: '',
  description: '',
  httpMethodList: ['GET'] as string[],
  apiPath: '',
  docUrl: '',
  isEnabled: true,
  isApiKey: false,
  isStatistics: true,
  rateLimitPerMinute: 0,
})

function formatCallCount(count: number) {
  if (count < 10000) {
    return `${count}次`
  }
  return `${Math.floor(count / 10000)}万`
}

const loadApis = async () => {
  const res = await $fetch<{ code: number, msg: string, data: ApiItem[] }>('/api/admin/apis/list')
  apis.value = res.data || []
}

const pickApi = (item: ApiItem) => {
  Object.assign(form, {
    ...item,
    httpMethodList: item.httpMethod.split(',').map(method => method.trim()).filter(Boolean),
  })
}

const saveApi = async () => {
  const payload = {
    ...form,
    httpMethod: form.httpMethodList.join(','),
  }
  if (form.id) {
    await $fetch('/api/admin/apis/update', { method: 'PUT', body: payload })
  }
  else {
    await $fetch('/api/admin/apis/add', { method: 'POST', body: payload })
  }
  notice.value = '接口已保存'
  await loadApis()
}

const deleteApi = async (id: number) => {
  await $fetch('/api/admin/apis/delete', { method: 'POST', body: { id } })
  await loadApis()
}

const toggle = async (item: ApiItem, field: 'isEnabled' | 'isStatistics') => {
  await $fetch('/api/admin/apis/toggle', { method: 'PUT', body: { id: item.id, field, value: !item[field] } })
  await loadApis()
}

onMounted(loadApis)
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
              接口管理
            </h1>
            <p class="auth-subtitle">
              维护 API 元数据、调用统计开关、启停状态与限流配置。
            </p>
          </div>
          <NuxtLink
            class="auth-button auth-ghost"
            to="/admin"
          >返回控制台</NuxtLink>
        </div>

        <div
          v-if="notice"
          class="text-sm text-muted mb-3"
        >
          {{ notice }}
        </div>

        <div class="grid gap-4">
          <div class="grid gap-3 border border-border rounded-[14px] p-4 bg-white">
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <input
                v-model="form.apiId"
                class="auth-input"
                placeholder="api_id"
                :disabled="form.id !== 0"
              >
              <input
                v-model="form.name"
                class="auth-input"
                placeholder="name"
              >
              <input
                v-model="form.category"
                class="auth-input"
                placeholder="category"
              >
              <input
                v-model="form.shortDesc"
                class="auth-input"
                placeholder="shortDesc"
              >
              <select
                v-model.number="form.status"
                class="auth-input"
              >
                <option :value="1">
                  正常
                </option>
                <option :value="0">
                  异常
                </option>
                <option :value="2">
                  维护
                </option>
                <option :value="3">
                  废弃
                </option>
              </select>
              <div class="auth-input h-auto min-h-[44px] flex flex-wrap gap-2 items-center">
                <label
                  v-for="method in methodOptions"
                  :key="method"
                  class="flex items-center gap-1 text-sm"
                >
                  <input
                    v-model="form.httpMethodList"
                    type="checkbox"
                    :value="method"
                  >
                  {{ method }}
                </label>
              </div>
              <input
                v-model="form.apiPath"
                class="auth-input"
                placeholder="apiPath"
              >
              <input
                v-model="form.docUrl"
                class="auth-input"
                placeholder="docUrl"
              >
              <input
                v-model.number="form.rateLimitPerMinute"
                type="number"
                class="auth-input"
                placeholder="rate limit"
              >
            </div>
            <textarea
              v-model="form.description"
              class="auth-input min-h-[96px]"
              placeholder="description"
            />
            <div class="grid gap-2 md:grid-cols-3">
              <label class="flex items-center gap-2 text-sm"><input
                v-model="form.isEnabled"
                type="checkbox"
              > 启用</label>
              <label class="flex items-center gap-2 text-sm"><input
                v-model="form.isApiKey"
                type="checkbox"
              > 需要 API Key</label>
              <label class="flex items-center gap-2 text-sm"><input
                v-model="form.isStatistics"
                type="checkbox"
              > 开启统计</label>
            </div>
            <div class="auth-actions">
              <button
                class="auth-button"
                @click="saveApi"
              >
                保存接口
              </button>
            </div>
          </div>

          <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in apis"
              :key="item.id"
              class="p-3 rounded-[12px] border border-border bg-white"
            >
              <div class="font-semibold">
                {{ item.apiId }} · {{ item.name }}
              </div>
              <div
                v-if="item.category"
                class="flex flex-wrap gap-1 mt-1"
              >
                <span
                  v-for="category in item.category.split(',').map(part => part.trim()).filter(Boolean)"
                  :key="`${item.id}-cat-${category}`"
                  class="px-2 py-0.5 rounded-full text-[11px] border border-border bg-bg text-muted"
                >
                  {{ category }}
                </span>
              </div>
              <div class="flex flex-wrap gap-1 mt-1">
                <span
                  v-for="method in item.httpMethod.split(',').map(part => part.trim()).filter(Boolean)"
                  :key="`${item.id}-${method}`"
                  class="px-2 py-0.5 rounded-full text-[11px] border border-border bg-bg text-muted"
                >
                  {{ method }}
                </span>
              </div>
              <div class="text-xs text-muted mt-1">
                {{ item.apiPath }}
              </div>
              <div class="flex flex-wrap gap-2 mt-2 text-[11px] text-muted">
                <span class="px-2 py-0.5 rounded-full border border-border bg-bg">{{ formatCallCount(item.totalCalls ?? 0) }}</span>
              </div>
              <div class="auth-actions mt-2">
                <button
                  class="auth-button auth-ghost"
                  @click="pickApi(item)"
                >
                  编辑
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="toggle(item, 'isEnabled')"
                >
                  {{ item.isEnabled ? '禁用' : '启用' }}
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="toggle(item, 'isStatistics')"
                >
                  {{ item.isStatistics ? '停用统计' : '启用统计' }}
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="deleteApi(item.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>API Modules</h3>
        <p>接口元数据和统计逻辑分开维护。</p>
        <div class="auth-chip">
          API Lists · Stats Toggle
        </div>
      </div>
    </div>
  </div>
</template>
