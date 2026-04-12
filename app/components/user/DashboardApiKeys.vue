<script lang="ts" setup>
import { toast } from 'vue-sonner'

interface ApiKeyItem {
  id: number
  name: string
  apiKey: string
  isActive: boolean
  createdAt: string
}

const list = ref<ApiKeyItem[]>([])
const loading = ref(false)
const creating = ref(false)
const name = ref('')
const status = ref('')

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

const formatDate = (value: string) => {
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

const load = async () => {
  loading.value = true
  status.value = ''
  try {
    const res = await $fetch<{ code: number, msg: string, data: ApiKeyItem[] }>('/api/user/apikeys/list')
    list.value = res.data || []
  }
  catch (error: unknown) {
    status.value = getErrorMessage(error, '加载失败')
    toast.error(status.value)
  }
  finally {
    loading.value = false
  }
}

const addKey = async () => {
  creating.value = true
  status.value = ''
  try {
    await $fetch('/api/user/apikeys/add', {
      method: 'POST',
      body: { name: name.value },
    })
    name.value = ''
    toast.success('API Key 已创建')
    await load()
  }
  catch (error: unknown) {
    status.value = getErrorMessage(error, '新增失败')
    toast.error(status.value)
  }
  finally {
    creating.value = false
  }
}

const deleteKey = async (id: number) => {
  status.value = ''
  try {
    await $fetch('/api/user/apikeys/delete', {
      method: 'POST',
      body: { id },
    })
    toast.success('API Key 已删除')
    await load()
  }
  catch (error: unknown) {
    status.value = getErrorMessage(error, '删除失败')
    toast.error(status.value)
  }
}

const resetKey = async (id: number) => {
  status.value = ''
  try {
    await $fetch('/api/user/apikeys/reset', {
      method: 'POST',
      body: { id },
    })
    toast.success('API Key 已重置')
    await load()
  }
  catch (error: unknown) {
    status.value = getErrorMessage(error, '重置失败')
    toast.error(status.value)
  }
}

await load()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Replaced template -->
    <div class="flex flex-col gap-6">
      <div class="w-full">
        <div class="w-full">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 class="text-2xl font-bold tracking-tight">
                用户后台 · API Key
              </h1>
              <p class="text-muted-foreground">
                在这里添加、删除、重置你的 API Key。
              </p>
            </div>
            <Badge variant="secondary">
              Self-Service
            </Badge>
          </div>

          <Card class="border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                新增密钥
              </CardTitle>
              <CardDescription>
                为空时会使用默认名称。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <Input
                  v-model="name"
                  type="text"
                  placeholder="密钥名称（可选）"
                />
                <Button
                  :disabled="creating"
                  @click="addKey"
                >
                  {{ creating ? '创建中...' : '新增密钥' }}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div
            v-if="status"
            class="mt-3"
          >
            <Badge variant="destructive">
              {{ status }}
            </Badge>
          </div>

          <Card class="mt-3 border-border/70 bg-card/90 shadow-sm">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                我的密钥
              </CardTitle>
              <CardDescription>
                共 {{ list.length }} 条记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                v-if="loading"
                class="grid gap-2"
              >
                <Skeleton class="h-12 w-full rounded-md" />
                <Skeleton class="h-12 w-full rounded-md" />
                <Skeleton class="h-12 w-full rounded-md" />
              </div>

              <Empty
                v-else-if="!list.length"
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
                    点击上方“新增密钥”创建第一条记录。
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
                      <TableHead class="w-[180px]">
                        创建时间
                      </TableHead>
                      <TableHead class="w-[220px] text-right">
                        操作
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="item in list"
                      :key="item.id"
                    >
                      <TableCell class="font-medium">
                        {{ item.name }}
                      </TableCell>
                      <TableCell class="max-w-[420px] truncate text-xs text-muted-foreground">
                        {{ item.apiKey }}
                      </TableCell>
                      <TableCell class="text-xs text-muted-foreground">
                        {{ formatDate(item.createdAt) }}
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
                                  重置后旧 Key 会立即失效。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction @click="resetKey(item.id)">
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
                                  删除后无法恢复，需要重新创建。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction
                                  class="bg-destructive text-white hover:bg-destructive/90"
                                  @click="deleteKey(item.id)"
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
</template>
