<script lang="ts" setup>
interface CallItem {
  id: number
  apiListId: number
  apiKey: string | null
  userId: number | null
  path: string
  method: string
  statusCode: number
  latencyMs: number
  ip: string | null
  createdAt: string
}

interface StatItem {
  id: number
  apiListId: number
  apiCallId: number | null
  statDate: string
  totalCount: number
  successCount: number
  failureCount: number
  apiPath: string | null
}

const calls = ref<CallItem[]>([])
const stats = ref<StatItem[]>([])
const summary = ref({ total: 0, success: 0, failure: 0 })
const loading = ref(false)
const notice = ref('')
const callsKeyword = ref('')
const methodFilter = ref('all')
const statusFilter = ref<'all' | '2xx' | '4xx' | '5xx'>('all')
const pageSize = ref(10)
const currentPage = ref(1)
const activeTab = ref<'stats' | 'calls'>('stats')

const pageSizeOptions = [10, 20, 50]

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const toast = useToast()
const notifyError = (message: string) => toast.add({ title: message, color: 'error' })

const successRate = computed(() => {
  if (summary.value.total <= 0) {
    return '0.00%'
  }
  return `${((summary.value.success / summary.value.total) * 100).toFixed(2)}%`
})

const methodOptions = computed(() => {
  return Array.from(new Set(calls.value.map(item => item.method.toUpperCase()))).sort((a, b) => a.localeCompare(b))
})

const filteredCalls = computed(() => {
  const keyword = callsKeyword.value.trim().toLowerCase()

  return calls.value.filter((item) => {
    const methodMatched = methodFilter.value === 'all' || item.method.toUpperCase() === methodFilter.value

    let statusMatched = true
    if (statusFilter.value === '2xx') {
      statusMatched = item.statusCode >= 200 && item.statusCode < 300
    }
    else if (statusFilter.value === '4xx') {
      statusMatched = item.statusCode >= 400 && item.statusCode < 500
    }
    else if (statusFilter.value === '5xx') {
      statusMatched = item.statusCode >= 500 && item.statusCode < 600
    }

    const keywordMatched = !keyword
      || item.path.toLowerCase().includes(keyword)
      || item.method.toLowerCase().includes(keyword)
      || String(item.statusCode).includes(keyword)
      || String(item.apiListId).includes(keyword)
      || (item.ip || '').toLowerCase().includes(keyword)

    return methodMatched && statusMatched && keywordMatched
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredCalls.value.length / pageSize.value))
})

const pagedCalls = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCalls.value.slice(start, start + pageSize.value)
})

const pageRangeText = computed(() => {
  if (filteredCalls.value.length === 0) {
    return '0-0'
  }
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filteredCalls.value.length)
  return `${start}-${end}`
})

watch([callsKeyword, methodFilter, statusFilter, pageSize], () => {
  currentPage.value = 1
})

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})

const goPrevPage = () => {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

const goNextPage = () => {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}

const resetCallFilters = () => {
  callsKeyword.value = ''
  methodFilter.value = 'all'
  statusFilter.value = 'all'
  pageSize.value = 10
  currentPage.value = 1
}

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
    second: '2-digit',
  })
}

const statusColor = (code: number) => {
  if (code >= 500) {
    return 'error'
  }
  if (code >= 400) {
    return 'warning'
  }
  return 'neutral'
}

const load = async () => {
  loading.value = true
  notice.value = ''
  try {
    const callRes = await $fetch<{ code: number, msg: string, data: CallItem[] }>('/api/admin/calls/list')
    calls.value = callRes.data || []
    const statRes = await $fetch<{ code: number, msg: string, data: { total: number, success: number, failure: number, items: StatItem[] } }>('/api/admin/calls/stats')
    summary.value = { total: statRes.data.total, success: statRes.data.success, failure: statRes.data.failure }
    stats.value = statRes.data.items || []
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载调用统计失败')
    notice.value = message
    notifyError(message)
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="grid gap-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h1 class="auth-title">
          调用统计
        </h1>
        <p class="auth-subtitle">
          查看调用日志和统计汇总。
        </p>
      </div>
      <UButton
        variant="outline"
        @click="load"
      >
        刷新
      </UButton>
    </div>

    <div
      v-if="notice"
      class="mb-3"
    >
      <UBadge color="error">
        {{ notice }}
      </UBadge>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
      <UCard class="border-border/70 bg-card/90 shadow-sm">
        <div class="pb-2">
          <p>总调用</p>
          <h3 class="text-2xl tabular-nums">
            {{ summary.total }}
          </h3>
        </div>
      </UCard>
      <UCard class="border-border/70 bg-card/90 shadow-sm">
        <div class="pb-2">
          <p>成功</p>
          <h3 class="text-2xl tabular-nums">
            {{ summary.success }}
          </h3>
        </div>
      </UCard>
      <UCard class="border-border/70 bg-card/90 shadow-sm">
        <div class="pb-2">
          <p>失败</p>
          <h3 class="text-2xl tabular-nums">
            {{ summary.failure }}
          </h3>
        </div>
      </UCard>
      <UCard class="border-border/70 bg-card/90 shadow-sm">
        <div class="pb-2">
          <p>成功率</p>
          <h3 class="text-2xl tabular-nums">
            {{ successRate }}
          </h3>
        </div>
      </UCard>
    </div>

    <UCard class="border-border/70 bg-card/90 shadow-sm">
      <div class="pt-6">
        <div
          v-if="loading"
          class="grid gap-2"
        >
          <USkeleton class="h-12 w-full rounded-md" />
          <USkeleton class="h-12 w-full rounded-md" />
          <USkeleton class="h-12 w-full rounded-md" />
        </div>

        <div
          v-else
          class="grid gap-3"
        >
          <div class="w-fit rounded-lg border border-border bg-muted/40 p-1">
            <UButton
              size="sm"
              :variant="activeTab === 'stats' ? 'solid' : 'ghost'"
              @click="activeTab = 'stats'"
            >
              统计表
            </UButton>
            <UButton
              size="sm"
              :variant="activeTab === 'calls' ? 'solid' : 'ghost'"
              @click="activeTab = 'calls'"
            >
              调用日志
            </UButton>
          </div>

          <section v-if="activeTab === 'stats'">
            <UEmpty
              v-if="!stats.length"
              class="border border-dashed border-border bg-background/60"
            >
              <div>
                <div>
                  <Icon
                    name="mdi:chart-timeline-variant"
                    class="size-5"
                  />
                </div>
                <h3>暂无统计数据</h3>
                <p>
                  当前时间范围内还没有聚合统计记录。
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
                    <th class="w-[140px]">
                      日期
                    </th>
                    <th>
                      API Path
                    </th>
                    <th class="w-[120px] text-right">
                      总计
                    </th>
                    <th class="w-[120px] text-right">
                      成功
                    </th>
                    <th class="w-[120px] text-right">
                      失败
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in stats"
                    :key="item.id"
                  >
                    <td class="text-xs text-muted-foreground">
                      {{ item.statDate }}
                    </td>
                    <td class="max-w-[420px] truncate">
                      {{ item.apiPath || `API List #${item.apiListId}` }}
                    </td>
                    <td class="text-right tabular-nums">
                      {{ item.totalCount }}
                    </td>
                    <td class="text-right tabular-nums">
                      {{ item.successCount }}
                    </td>
                    <td class="text-right tabular-nums">
                      {{ item.failureCount }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-else>
            <div class="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_180px_150px]">
              <UInput
                v-model="callsKeyword"
                placeholder="搜索 path / method / status / IP"
              />

              <select
                v-model="methodFilter"
                class="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">
                  全部方法
                </option>
                <option
                  v-for="method in methodOptions"
                  :key="method"
                  :value="method"
                >
                  {{ method }}
                </option>
              </select>

              <select
                v-model="statusFilter"
                class="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">
                  全部状态
                </option>
                <option value="2xx">
                  2xx
                </option>
                <option value="4xx">
                  4xx
                </option>
                <option value="5xx">
                  5xx
                </option>
              </select>

              <select
                v-model.number="pageSize"
                class="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option
                  v-for="size in pageSizeOptions"
                  :key="size"
                  :value="size"
                >
                  每页 {{ size }} 条
                </option>
              </select>
            </div>

            <div class="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>共 {{ filteredCalls.length }} 条，当前显示 {{ pageRangeText }}</span>
              <UButton
                variant="ghost"
                size="sm"
                @click="resetCallFilters"
              >
                重置筛选
              </UButton>
            </div>

            <UEmpty
              v-if="!filteredCalls.length"
              class="border border-dashed border-border bg-background/60"
            >
              <div>
                <div>
                  <Icon
                    name="mdi:file-document-outline"
                    class="size-5"
                  />
                </div>
                <h3>暂无调用日志</h3>
                <p>
                  当有 API 请求后会在此展示日志记录。
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
                      时间
                    </th>
                    <th class="w-[90px]">
                      方法
                    </th>
                    <th>
                      Path
                    </th>
                    <th class="w-[110px] text-right">
                      状态
                    </th>
                    <th class="w-[130px] text-right">
                      耗时
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in pagedCalls"
                    :key="item.id"
                  >
                    <td class="text-xs text-muted-foreground">
                      {{ formatDate(item.createdAt) }}
                    </td>
                    <td>
                      <UBadge variant="outline">
                        {{ item.method }}
                      </UBadge>
                    </td>
                    <td class="max-w-[520px] truncate text-xs text-muted-foreground">
                      {{ item.path }}
                    </td>
                    <td class="text-right">
                      <UBadge
                        variant="outline"
                        :color="statusColor(item.statusCode)"
                      >
                        {{ item.statusCode }}
                      </UBadge>
                    </td>
                    <td class="text-right tabular-nums">
                      {{ item.latencyMs }}ms
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="flex items-center justify-between border-t px-4 py-3">
                <p class="text-xs text-muted-foreground">
                  第 {{ currentPage }} / {{ totalPages }} 页
                </p>
                <div class="flex gap-2">
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="currentPage === 1"
                    @click="currentPage = 1"
                  >
                    首页
                  </UButton>
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="currentPage === 1"
                    @click="goPrevPage"
                  >
                    上一页
                  </UButton>
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="currentPage >= totalPages"
                    @click="goNextPage"
                  >
                    下一页
                  </UButton>
                  <UButton
                    variant="outline"
                    size="sm"
                    :disabled="currentPage >= totalPages"
                    @click="currentPage = totalPages"
                  >
                    末页
                  </UButton>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </UCard>
  </div>
</template>
