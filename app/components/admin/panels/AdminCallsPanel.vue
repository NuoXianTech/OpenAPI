<script lang="ts" setup>
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '~/components/ui/empty'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/components/ui/tabs'
import { toast } from 'vue-sonner'

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

const pageSizeOptions = [10, 20, 50]

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
      <Button
        variant="outline"
        @click="load"
      >
        刷新
      </Button>
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
            <div class="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_180px_150px]">
              <Input
                v-model="callsKeyword"
                placeholder="搜索 path / method / status / IP"
              />

              <Select v-model="methodFilter">
                <SelectTrigger>
                  <SelectValue placeholder="方法筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    全部方法
                  </SelectItem>
                  <SelectItem
                    v-for="method in methodOptions"
                    :key="method"
                    :value="method"
                  >
                    {{ method }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="statusFilter">
                <SelectTrigger>
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    全部状态
                  </SelectItem>
                  <SelectItem value="2xx">
                    2xx
                  </SelectItem>
                  <SelectItem value="4xx">
                    4xx
                  </SelectItem>
                  <SelectItem value="5xx">
                    5xx
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                :model-value="String(pageSize)"
                @update:model-value="(value) => pageSize = Number(value)"
              >
                <SelectTrigger>
                  <SelectValue placeholder="每页条数" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="size in pageSizeOptions"
                    :key="size"
                    :value="String(size)"
                  >
                    每页 {{ size }} 条
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>共 {{ filteredCalls.length }} 条，当前显示 {{ pageRangeText }}</span>
              <Button
                variant="ghost"
                size="sm"
                @click="resetCallFilters"
              >
                重置筛选
              </Button>
            </div>

            <Empty
              v-if="!filteredCalls.length"
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
                    v-for="item in pagedCalls"
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

              <div class="flex items-center justify-between border-t px-4 py-3">
                <p class="text-xs text-muted-foreground">
                  第 {{ currentPage }} / {{ totalPages }} 页
                </p>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="currentPage === 1"
                    @click="currentPage = 1"
                  >
                    首页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="currentPage === 1"
                    @click="goPrevPage"
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="currentPage >= totalPages"
                    @click="goNextPage"
                  >
                    下一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="currentPage >= totalPages"
                    @click="currentPage = totalPages"
                  >
                    末页
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  </div>
</template>
