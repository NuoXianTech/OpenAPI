<script lang="ts" setup>
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

const load = async () => {
  const res = await $fetch<{ code: number; msg: string; data: FriendLinkItem[] }>('/api/admin/friend-links/list')
  items.value = res.data || []
}

const pick = (item: FriendLinkItem) => Object.assign(form, item)

const save = async () => {
  if (form.id) {
    await $fetch('/api/admin/friend-links/update', { method: 'PUT', body: form })
  }
  else {
    await $fetch('/api/admin/friend-links/add', { method: 'POST', body: form })
  }
  notice.value = '友情链接已保存'
  await load()
}

const remove = async (id: number) => {
  await $fetch('/api/admin/friend-links/delete', { method: 'POST', body: { id } })
  await load()
}

onMounted(load)
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card" style="width:min(1080px, 96vw);">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 class="auth-title">友情链接管理</h1>
            <p class="auth-subtitle">新增、编辑、删除友情链接。</p>
          </div>
          <NuxtLink class="auth-button auth-ghost" to="/admin">返回控制台</NuxtLink>
        </div>

        <div v-if="notice" class="text-sm text-muted mb-3">{{ notice }}</div>

        <div class="grid gap-4">
          <div class="grid gap-3 border border-border rounded-[14px] p-4 bg-white">
            <div class="grid gap-3 md:grid-cols-2">
              <input v-model="form.title" class="auth-input" placeholder="标题">
              <input v-model="form.url" class="auth-input" placeholder="链接地址">
            </div>
            <input v-model="form.description" class="auth-input" placeholder="描述">
            <label class="flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox"> 启用</label>
            <div class="auth-actions">
              <button class="auth-button" @click="save">保存友情链接</button>
            </div>
          </div>

          <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <div v-for="item in items" :key="item.id" class="p-3 rounded-[12px] border border-border bg-white">
              <div class="font-semibold">{{ item.title }}</div>
              <div class="text-xs text-muted break-all">{{ item.url }}</div>
              <div class="auth-actions mt-2">
                <button class="auth-button auth-ghost" @click="pick(item)">编辑</button>
                <button class="auth-button auth-ghost" @click="remove(item.id)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Friend Links</h3>
        <p>友情链接独立模块。</p>
        <div class="auth-chip">Manage Links</div>
      </div>
    </div>
  </div>
</template>
