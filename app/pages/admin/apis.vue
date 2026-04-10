<script lang="ts" setup>
import ApiFilterTabs from '~/components/api/ApiFilterTabs.vue'
import { CATEGORY_TAG_MAX_COUNT } from '~~/shared/constants/api'
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth-admin' })

interface ApiItem {
  id: number
  code: string
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

interface ApiTabOption {
  label: string
  value: string | number
}

const methodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const statusOptions = [
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
  { label: '维护', value: 2 },
  { label: '废弃', value: 3 },
]

const catalogApis = ref<ApiItem[]>([])
const notice = ref('')
const query = ref('')
const currentStatus = ref<string | number>('all')
const currentCategory = ref('all')
const categoryDraft = ref('')
const pageSize = ref(12)
const currentPage = ref(1)

const pageSizeOptions = [12, 24, 48]

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const form = reactive({
  id: 0,
  code: '',
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

const statusTabs: ApiTabOption[] = [
  { label: '全部', value: 'all' },
  { label: '正常', value: 1 },
  { label: '异常', value: 0 },
  { label: '维护', value: 2 },
  { label: '废弃', value: 3 },
]

const categoryTabs = computed<ApiTabOption[]>(() => {
  const categories = new Set<string>()
  catalogApis.value.forEach((item) => {
    (item.category || '')
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(category => categories.add(category))
  })

  return [
    { label: '全部', value: 'all' },
    ...Array.from(categories).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN')).map(category => ({
      label: category,
      value: category,
    })),
  ]
})

function splitCategoryTags(value: string | null | undefined) {
  if (!value) {
    return []
  }

  return Array.from(new Set(
    value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean),
  ))
}

const formCategoryTags = computed(() => splitCategoryTags(form.category))

const categoryTagHint = computed(() => {
  if (formCategoryTags.value.length >= CATEGORY_TAG_MAX_COUNT) {
    return `最多 ${CATEGORY_TAG_MAX_COUNT} 个 tag`
  }
  return '示例：test1,test2'
})

function addCategoryTags(raw: string) {
  const incoming = raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  if (incoming.length === 0) {
    return
  }

  const tags = splitCategoryTags(form.category)
  for (const tag of incoming) {
    if (tags.includes(tag)) {
      continue
    }
    if (tags.length >= CATEGORY_TAG_MAX_COUNT) {
      notice.value = `分类 tag 最多 ${CATEGORY_TAG_MAX_COUNT} 个`
      break
    }
    tags.push(tag)
  }

  form.category = tags.join(',')
  categoryDraft.value = ''
}

function removeCategoryTag(tag: string) {
  const tags = splitCategoryTags(form.category).filter(item => item !== tag)
  form.category = tags.join(',')
}

function commitCategoryDraft() {
  addCategoryTags(categoryDraft.value)
}

function setMethodChecked(method: string, checked: boolean | 'indeterminate') {
  if (checked) {
    if (!form.httpMethodList.includes(method)) {
      form.httpMethodList.push(method)
    }
    return
  }
  form.httpMethodList = form.httpMethodList.filter(item => item !== method)
}

function isMethodChecked(method: string) {
  return form.httpMethodList.includes(method)
}

function formatCallCount(count: number) {
  if (count < 10000) {
    return `${count}次`
  }
  return `${Math.floor(count / 10000)}万`
}

const filteredApis = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return catalogApis.value.filter((api) => {
    const matchesQuery = !keyword
      || api.code.toLowerCase().includes(keyword)
      || api.name.toLowerCase().includes(keyword)
      || api.description.toLowerCase().includes(keyword)
      || (api.shortDesc || '').toLowerCase().includes(keyword)
      || (api.category || '').toLowerCase().includes(keyword)

    const matchesStatus = currentStatus.value === 'all' || api.status === Number(currentStatus.value)
    const categories = (api.category || '').split(',').map(part => part.trim()).filter(Boolean)
    const matchesCategory = currentCategory.value === 'all' || categories.includes(String(currentCategory.value))

    return matchesQuery && matchesStatus && matchesCategory
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredApis.value.length / pageSize.value))
})

const pagedApis = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredApis.value.slice(start, start + pageSize.value)
})

const pageRangeText = computed(() => {
  if (!filteredApis.value.length) {
    return '0-0'
  }
  const start = (currentPage.value - 1) * pageSize.value + 1
  const end = Math.min(currentPage.value * pageSize.value, filteredApis.value.length)
  return `${start}-${end}`
})

watch([query, currentStatus, currentCategory, pageSize], () => {
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

const resetListFilters = () => {
  query.value = ''
  currentStatus.value = 'all'
  currentCategory.value = 'all'
  pageSize.value = 12
  currentPage.value = 1
}

const loadCatalog = async () => {
  try {
    const res = await $fetch<{ code: number, msg: string, data: ApiItem[] }>('/api/admin/apis/list')
    catalogApis.value = res.data || []
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '加载接口列表失败')
    notice.value = message
    toast.error(message)
  }
}

const pickApi = (item: ApiItem) => {
  Object.assign(form, {
    ...item,
    httpMethodList: item.httpMethod.split(',').map(method => method.trim()).filter(Boolean),
  })
}

const saveApi = async () => {
  const normalizedCategoryTags = splitCategoryTags(form.category)
  if (normalizedCategoryTags.length > CATEGORY_TAG_MAX_COUNT) {
    notice.value = `分类 tag 最多 ${CATEGORY_TAG_MAX_COUNT} 个`
    return
  }

  const payload = {
    ...form,
    category: normalizedCategoryTags.join(','),
    httpMethod: form.httpMethodList.join(','),
  }
  try {
    if (form.id) {
      await $fetch('/api/admin/apis/update', { method: 'PUT', body: payload })
    }
    else {
      await $fetch('/api/admin/apis/add', { method: 'POST', body: payload })
    }
    notice.value = '接口已保存'
    toast.success(notice.value)
    await loadCatalog()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '保存接口失败')
    notice.value = message
    toast.error(message)
  }
}

const deleteApi = async (id: number) => {
  try {
    await $fetch('/api/admin/apis/delete', { method: 'POST', body: { id } })
    toast.success('接口已删除')
    await loadCatalog()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除接口失败')
    notice.value = message
    toast.error(message)
  }
}

const toggle = async (item: ApiItem, field: 'isEnabled' | 'isStatistics') => {
  try {
    await $fetch('/api/admin/apis/toggle', { method: 'PUT', body: { id: item.id, field, value: !item[field] } })
    toast.success(field === 'isEnabled' ? '启停状态已更新' : '统计开关已更新')
    await loadCatalog()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '切换状态失败')
    notice.value = message
    toast.error(message)
  }
}

onMounted(loadCatalog)
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
          <div class="flex items-center gap-2">
            <Badge variant="secondary">
              {{ filteredApis.length }} APIs
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

        <div class="grid gap-4">
          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                筛选条件
              </CardTitle>
              <CardDescription>
                支持关键词、状态和分类 tag 筛选
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3">
              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <Input
                  v-model="query"
                  placeholder="搜索 code / name / description"
                />

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

                <Button
                  variant="ghost"
                  @click="resetListFilters"
                >
                  重置筛选
                </Button>
              </div>
              <div>
                <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  状态筛选
                </div>
                <ApiFilterTabs
                  v-model="currentStatus"
                  :tabs="statusTabs"
                  aria-label="API 状态筛选"
                />
              </div>
              <div>
                <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  分类筛选
                </div>
                <ApiFilterTabs
                  v-model="currentCategory"
                  :tabs="categoryTabs"
                  :max-visible="10"
                  aria-label="API 分类筛选"
                />
              </div>

              <div class="text-xs text-muted-foreground">
                共 {{ filteredApis.length }} 条，当前显示 {{ pageRangeText }}
              </div>
            </CardContent>
          </Card>

          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                {{ form.id ? `编辑接口 #${form.id}` : '新增接口' }}
              </CardTitle>
              <CardDescription>
                填写接口元数据和调用策略
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3">
              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Input
                  v-model="form.code"
                  placeholder="code"
                  :disabled="form.id !== 0"
                />
                <Input
                  v-model="form.name"
                  placeholder="name"
                />
                <Input
                  v-model="form.shortDesc"
                  placeholder="shortDesc"
                />

                <div class="grid gap-2">
                  <Label>
                    状态
                  </Label>
                  <Select
                    :model-value="String(form.status)"
                    @update:model-value="(value) => form.status = Number(value)"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择状态" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="option in statusOptions"
                        :key="option.value"
                        :value="String(option.value)"
                      >
                        {{ option.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="rounded-md border border-input bg-background p-3 md:col-span-2">
                  <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    HTTP Method
                  </div>
                  <div class="flex flex-wrap gap-3">
                    <label
                      v-for="method in methodOptions"
                      :key="method"
                      class="flex items-center gap-1 text-sm"
                    >
                      <Checkbox
                        :model-value="isMethodChecked(method)"
                        @update:model-value="(checked) => setMethodChecked(method, checked)"
                      />
                      {{ method }}
                    </label>
                  </div>
                </div>

                <Input
                  v-model="form.apiPath"
                  placeholder="apiPath"
                />
                <Input
                  v-model="form.docUrl"
                  placeholder="docUrl"
                />
                <Input
                  v-model.number="form.rateLimitPerMinute"
                  type="number"
                  placeholder="rate limit"
                />

                <div class="md:col-span-2 xl:col-span-3">
                  <div class="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    分类标签（最多 {{ CATEGORY_TAG_MAX_COUNT }} 个）
                  </div>
                  <div class="flex min-h-[44px] flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2">
                    <Badge
                      v-for="tag in formCategoryTags"
                      :key="`form-tag-${tag}`"
                      variant="outline"
                      class="gap-1"
                    >
                      <span>{{ tag }}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        class="h-4 w-4 p-0"
                        @click="removeCategoryTag(tag)"
                      >
                        <Icon
                          name="mdi:close"
                          size="12"
                        />
                      </Button>
                    </Badge>
                    <Input
                      v-model="categoryDraft"
                      class="min-w-[160px] flex-1 border-0 shadow-none focus-visible:ring-0"
                      placeholder="输入标签后回车，支持 test1,test2"
                      @keydown.enter.prevent="commitCategoryDraft"
                      @blur="commitCategoryDraft"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      @click="commitCategoryDraft"
                    >
                      添加
                    </Button>
                  </div>
                  <div class="text-xs text-muted-foreground mt-1 flex items-center justify-between gap-2">
                    <span>{{ categoryTagHint }}</span>
                    <span>{{ formCategoryTags.length }}/{{ CATEGORY_TAG_MAX_COUNT }}</span>
                  </div>
                </div>
              </div>

              <Textarea
                v-model="form.description"
                class="min-h-[96px]"
                placeholder="description"
              />

              <div class="grid gap-2 md:grid-cols-3">
                <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div class="text-sm">
                    启用
                  </div>
                  <Switch v-model="form.isEnabled" />
                </div>
                <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div class="text-sm">
                    需要 API Key
                  </div>
                  <Switch v-model="form.isApiKey" />
                </div>
                <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
                  <div class="text-sm">
                    开启统计
                  </div>
                  <Switch v-model="form.isStatistics" />
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button @click="saveApi">
                  保存接口
                </Button>
              </div>
            </CardContent>
          </Card>

          <Empty
            v-if="!filteredApis.length"
            class="border border-dashed border-border bg-background/60"
          >
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon
                  name="mdi:api-off"
                  class="size-5"
                />
              </EmptyMedia>
              <EmptyTitle>暂无接口数据</EmptyTitle>
              <EmptyDescription>
                调整筛选条件或新增接口后会显示在这里。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>

          <TransitionGroup
            v-else
            tag="div"
            name="api-card"
            class="grid gap-2 md:grid-cols-2 xl:grid-cols-3 api-card-grid"
            appear
          >
            <Card
              v-for="item in pagedApis"
              :key="item.id"
              class="api-card-item border-border/70 bg-card/90 shadow-sm"
            >
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  {{ item.code }} · {{ item.name }}
                </CardTitle>
                <CardDescription>
                  {{ item.apiPath }}
                </CardDescription>
              </CardHeader>

              <CardContent class="grid gap-3">
                <div
                  v-if="item.category"
                  class="flex flex-wrap gap-1"
                >
                  <Badge
                    v-for="category in item.category.split(',').map(part => part.trim()).filter(Boolean)"
                    :key="`${item.id}-cat-${category}`"
                    variant="outline"
                  >
                    {{ category }}
                  </Badge>
                </div>

                <div class="flex flex-wrap gap-1">
                  <Badge
                    v-for="method in item.httpMethod.split(',').map(part => part.trim()).filter(Boolean)"
                    :key="`${item.id}-${method}`"
                    variant="secondary"
                  >
                    {{ method }}
                  </Badge>
                </div>

                <div class="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span class="rounded-full border border-border bg-background px-2 py-0.5">
                    {{ formatCallCount(item.totalCalls ?? 0) }}
                  </span>
                  <span class="rounded-full border border-border bg-background px-2 py-0.5">
                    {{ item.isEnabled ? '启用' : '停用' }}
                  </span>
                  <span class="rounded-full border border-border bg-background px-2 py-0.5">
                    {{ item.isStatistics ? '统计开启' : '统计关闭' }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="pickApi(item)"
                  >
                    编辑
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    @click="toggle(item, 'isEnabled')"
                  >
                    {{ item.isEnabled ? '禁用' : '启用' }}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    @click="toggle(item, 'isStatistics')"
                  >
                    {{ item.isStatistics ? '停用统计' : '启用统计' }}
                  </Button>

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
                        <AlertDialogTitle>确认删除该接口？</AlertDialogTitle>
                        <AlertDialogDescription>
                          删除后将无法继续调用该 API 元数据记录。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          class="bg-destructive text-white hover:bg-destructive/90"
                          @click="deleteApi(item.id)"
                        >
                          确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TransitionGroup>

          <Card
            v-if="filteredApis.length"
            class="border-border/70 bg-card/90 shadow-sm"
          >
            <CardContent class="py-3 flex items-center justify-between gap-2">
              <p class="text-xs text-muted-foreground">
                第 {{ currentPage }} / {{ totalPages }} 页
              </p>
              <div class="flex flex-wrap gap-2">
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
            </CardContent>
          </Card>
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
