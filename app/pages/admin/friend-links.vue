<script lang="ts" setup>
import { toast } from 'vue-sonner'

definePageMeta({ middleware: 'auth-admin' })

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
    toast.error(message)
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
    toast.success(notice.value)
    resetForm()
    await load()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '保存友情链接失败')
    notice.value = message
    toast.error(message)
  }
}

const remove = async (id: number) => {
  try {
    await $fetch('/api/admin/friend-links/delete', { method: 'POST', body: { id } })
    toast.success('友情链接已删除')
    if (form.id === id) {
      resetForm()
    }
    await load()
  }
  catch (error: unknown) {
    const message = getErrorMessage(error, '删除友情链接失败')
    notice.value = message
    toast.error(message)
  }
}

onMounted(load)
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(1080px, 96vw);"
      >
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 class="auth-title">
              友情链接管理
            </h1>
            <p class="auth-subtitle">
              新增、编辑、删除友情链接。
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Badge variant="secondary">
              {{ items.length }} Links
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
                {{ form.id ? '编辑友情链接' : '新增友情链接' }}
              </CardTitle>
              <CardDescription>
                支持启停控制，标题和链接为必填项。
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3">
              <div class="grid gap-3 md:grid-cols-2">
                <div class="grid gap-2">
                  <Label for="link-title">
                    标题
                  </Label>
                  <Input
                    id="link-title"
                    v-model="form.title"
                    placeholder="标题"
                  />
                </div>
                <div class="grid gap-2">
                  <Label for="link-url">
                    链接地址
                  </Label>
                  <Input
                    id="link-url"
                    v-model="form.url"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div class="grid gap-2">
                <Label for="link-description">
                  描述
                </Label>
                <Textarea
                  id="link-description"
                  v-model="form.description"
                  placeholder="友情链接描述（可选）"
                  class="min-h-[88px]"
                />
              </div>

              <div class="flex items-center justify-between rounded-md border border-border bg-background p-3">
                <div>
                  <div class="text-sm font-medium">
                    启用状态
                  </div>
                  <div class="text-xs text-muted-foreground">
                    关闭后前台不展示该链接
                  </div>
                </div>
                <Switch v-model="form.isActive" />
              </div>

              <div class="flex flex-wrap gap-2">
                <Button @click="save">
                  {{ form.id ? '更新友情链接' : '保存友情链接' }}
                </Button>
                <Button
                  variant="outline"
                  @click="resetForm"
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          <Empty
            v-if="!items.length"
            class="border border-dashed border-border bg-background/60"
          >
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon
                  name="mdi:link-off"
                  class="size-5"
                />
              </EmptyMedia>
              <EmptyTitle>暂无友情链接</EmptyTitle>
              <EmptyDescription>
                保存上方表单后会自动出现在这里。
              </EmptyDescription>
            </EmptyHeader>
          </Empty>

          <div
            v-else
            class="grid gap-2 md:grid-cols-2 xl:grid-cols-3"
          >
            <Card
              v-for="item in items"
              :key="item.id"
              class="border-border/70 bg-card/90 shadow-sm"
            >
              <CardHeader class="pb-3">
                <div class="flex items-start justify-between gap-2">
                  <CardTitle class="line-clamp-1 text-base">
                    {{ item.title }}
                  </CardTitle>
                  <Badge :variant="item.isActive ? 'secondary' : 'outline'">
                    {{ item.isActive ? '启用' : '停用' }}
                  </Badge>
                </div>
                <CardDescription class="break-all">
                  {{ item.url }}
                </CardDescription>
              </CardHeader>
              <CardContent class="grid gap-3">
                <p class="text-sm text-muted-foreground line-clamp-2">
                  {{ item.description || '暂无描述' }}
                </p>
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    @click="pick(item)"
                  >
                    编辑
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
                        <AlertDialogTitle>确认删除该友情链接？</AlertDialogTitle>
                        <AlertDialogDescription>
                          删除后不会在前台展示，且无法恢复。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          class="bg-destructive text-white hover:bg-destructive/90"
                          @click="remove(item.id)"
                        >
                          确认删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Friend Links</h3>
        <p>友情链接独立模块。</p>
        <div class="auth-chip">
          Manage Links
        </div>
      </div>
    </div>
  </div>
</template>
