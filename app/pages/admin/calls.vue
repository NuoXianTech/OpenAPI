<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })

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

const load = async () => {
  const callRes = await $fetch<{ code: number, msg: string, data: CallItem[] }>('/api/admin/calls/list')
  calls.value = callRes.data || []
  const statRes = await $fetch<{ code: number, msg: string, data: { total: number, success: number, failure: number, items: StatItem[] } }>('/api/admin/calls/stats')
  summary.value = { total: statRes.data.total, success: statRes.data.success, failure: statRes.data.failure }
  stats.value = statRes.data.items || []
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
              调用统计
            </h1>
            <p class="auth-subtitle">
              查看调用日志和统计汇总。
            </p>
          </div>
          <NuxtLink
            class="auth-button auth-ghost"
            to="/admin"
          >返回控制台</NuxtLink>
        </div>

        <div class="grid gap-3 md:grid-cols-3 mb-4">
          <div class="p-4 rounded-[14px] border border-border bg-white md:col-span-3">
            总调用：{{ summary.total }}
          </div>
        </div>

        <div class="grid gap-4">
          <section class="grid gap-2">
            <h2 class="font-semibold">
              统计表
            </h2>
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="item in stats"
                :key="item.id"
                class="p-3 rounded-[12px] border border-border bg-white text-sm"
              >
                <div class="font-semibold">
                  API List ID: {{ item.apiListId }}
                </div>
                <div class="text-xs text-muted">
                  {{ item.apiPath }}
                </div>
                <div class="text-xs text-muted mt-1">
                  {{ item.statDate }}
                </div>
                <div class="text-xs text-muted mt-1">
                  总计 {{ item.totalCount }}
                </div>
              </div>
            </div>
          </section>

          <section class="grid gap-2">
            <h2 class="font-semibold">
              调用日志
            </h2>
            <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div
                v-for="item in calls"
                :key="item.id"
                class="p-3 rounded-[12px] border border-border bg-white text-sm"
              >
                <div class="font-semibold">
                  API List ID: {{ item.apiListId }} · {{ item.method }}
                </div>
                <div class="text-xs text-muted break-all">
                  {{ item.path }}
                </div>
                <div class="text-xs text-muted mt-1">
                  状态 {{ item.statusCode }} / 耗时 {{ item.latencyMs }}ms
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Call Stats</h3>
        <p>日志表与统计表分开存储，便于聚合查询。</p>
        <div class="auth-chip">
          Logs · Stats
        </div>
      </div>
    </div>
  </div>
</template>
