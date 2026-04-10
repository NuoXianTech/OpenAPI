<script lang="ts" setup>
import { toast } from 'vue-sonner'

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
const loading = ref(false)
const notice = ref('')

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const successRate = computed(() => {
  if (summary.value.total <= 0) {
    return '0.00%'
  }
  return `${((summary.value.success / summary.value.total) * 100).toFixed(2)}%`
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
    second: '2-digit',
  })
}

const statusVariant = (code: number) => {
  if (code >= 500) {
    return 'destructive'
  }
  if (code >= 400) {
    return 'outline'
  }
  return 'secondary'
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
    toast.error(message)
  }
  finally {
    loading.value = false
  }
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
          <div class="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              @click="load"
            >
              刷新
            </Button>
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
          <Badge variant="destructive">
            {{ notice }}
          </Badge>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-2">
              <CardDescription>总调用</CardDescription>
              <CardTitle class="text-2xl tabular-nums">
                {{ summary.total }}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-2">
              <CardDescription>成功</CardDescription>
              <CardTitle class="text-2xl tabular-nums">
                {{ summary.success }}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-2">
              <CardDescription>失败</CardDescription>
              <CardTitle class="text-2xl tabular-nums">
                {{ summary.failure }}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-2">
              <CardDescription>成功率</CardDescription>
              <CardTitle class="text-2xl tabular-nums">
                {{ successRate }}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card class="border-border/70 bg-card/90 shadow-sm">
          <CardContent class="pt-6">
            <div
              v-if="loading"
              class="grid gap-2"
            >
              <Skeleton class="h-12 w-full rounded-md" />
              <Skeleton class="h-12 w-full rounded-md" />
              <Skeleton class="h-12 w-full rounded-md" />
            </div>

            <Tabs
              v-else
              default-value="stats"
              class="grid gap-3"
            >
              <TabsList class="w-fit">
                <TabsTrigger value="stats">
                  统计表
                </TabsTrigger>
                <TabsTrigger value="calls">
                  调用日志
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stats">
                <Empty
                  v-if="!stats.length"
                  class="border border-dashed border-border bg-background/60"
                >
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Icon
                        name="mdi:chart-timeline-variant"
                        class="size-5"
                      />
                    </EmptyMedia>
                    <EmptyTitle>暂无统计数据</EmptyTitle>
                    <EmptyDescription>
                      当前时间范围内还没有聚合统计记录。
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
                        <TableHead class="w-[140px]">
                          日期
                        </TableHead>
                        <TableHead>
                          API Path
                        </TableHead>
                        <TableHead class="w-[120px] text-right">
                          总计
                        </TableHead>
                        <TableHead class="w-[120px] text-right">
                          成功
                        </TableHead>
                        <TableHead class="w-[120px] text-right">
                          失败
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="item in stats"
                        :key="item.id"
                      >
                        <TableCell class="text-xs text-muted-foreground">
                          {{ item.statDate }}
                        </TableCell>
                        <TableCell class="max-w-[420px] truncate">
                          {{ item.apiPath || `API List #${item.apiListId}` }}
                        </TableCell>
                        <TableCell class="text-right tabular-nums">
                          {{ item.totalCount }}
                        </TableCell>
                        <TableCell class="text-right tabular-nums">
                          {{ item.successCount }}
                        </TableCell>
                        <TableCell class="text-right tabular-nums">
                          {{ item.failureCount }}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="calls">
                <Empty
                  v-if="!calls.length"
                  class="border border-dashed border-border bg-background/60"
                >
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Icon
                        name="mdi:file-document-outline"
                        class="size-5"
                      />
                    </EmptyMedia>
                    <EmptyTitle>暂无调用日志</EmptyTitle>
                    <EmptyDescription>
                      当有 API 请求后会在此展示日志记录。
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
                        <TableHead class="w-[160px]">
                          时间
                        </TableHead>
                        <TableHead class="w-[90px]">
                          方法
                        </TableHead>
                        <TableHead>
                          Path
                        </TableHead>
                        <TableHead class="w-[110px] text-right">
                          状态
                        </TableHead>
                        <TableHead class="w-[130px] text-right">
                          耗时
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow
                        v-for="item in calls"
                        :key="item.id"
                      >
                        <TableCell class="text-xs text-muted-foreground">
                          {{ formatDate(item.createdAt) }}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {{ item.method }}
                          </Badge>
                        </TableCell>
                        <TableCell class="max-w-[520px] truncate text-xs text-muted-foreground">
                          {{ item.path }}
                        </TableCell>
                        <TableCell class="text-right">
                          <Badge :variant="statusVariant(item.statusCode)">
                            {{ item.statusCode }}
                          </Badge>
                        </TableCell>
                        <TableCell class="text-right tabular-nums">
                          {{ item.latencyMs }}ms
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
