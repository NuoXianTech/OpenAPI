<script lang="ts" setup>
definePageMeta({ middleware: ['auth-user' as any] })

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

const load = async () => {
  loading.value = true
  status.value = ''
  try {
    const res = await $fetch<{ code: number, msg: string, data: ApiKeyItem[] }>('/api/user/apikeys/list')
    list.value = res.data || []
  }
  catch (error: any) {
    status.value = error?.message || '加载失败'
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
    await load()
  }
  catch (error: any) {
    status.value = error?.message || '新增失败'
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
    await load()
  }
  catch (error: any) {
    status.value = error?.message || '删除失败'
  }
}

const resetKey = async (id: number) => {
  status.value = ''
  try {
    await $fetch('/api/user/apikeys/reset', {
      method: 'POST',
      body: { id },
    })
    await load()
  }
  catch (error: any) {
    status.value = error?.message || '重置失败'
  }
}

await load()
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div class="auth-card">
        <h1 class="auth-title">
          用户后台 · API Key
        </h1>
        <p class="auth-subtitle">
          在这里可以添加、删除、重置你的 API Key。
        </p>

        <div class="auth-grid">
          <div class="grid grid-cols-[1fr_auto] gap-2">
            <input
              v-model="name"
              type="text"
              class="auth-input"
              placeholder="密钥名称（可选）"
            >
            <button
              class="auth-button"
              :disabled="creating"
              @click="addKey"
            >
              {{ creating ? '创建中...' : '新增密钥' }}
            </button>
          </div>

          <div
            v-if="status"
            class="text-sm text-muted-foreground"
          >
            {{ status }}
          </div>

          <div
            v-if="loading"
            class="text-sm text-muted-foreground"
          >
            加载中...
          </div>
          <div
            v-else
            class="grid gap-2"
          >
            <div
              v-for="item in list"
              :key="item.id"
              class="p-3 rounded-[12px] border border-border bg-card"
            >
              <div class="text-sm font-semibold">
                {{ item.name }}
              </div>
              <div class="text-xs text-muted-foreground mt-1 break-all">
                {{ item.apiKey }}
              </div>
              <div class="auth-actions mt-2">
                <button
                  class="auth-button auth-ghost"
                  @click="resetKey(item.id)"
                >
                  重置
                </button>
                <button
                  class="auth-button auth-ghost"
                  @click="deleteKey(item.id)"
                >
                  删除
                </button>
              </div>
            </div>
            <div
              v-if="!list.length"
              class="text-sm text-muted-foreground"
            >
              暂无 API Key
            </div>
          </div>

          <div class="auth-actions">
            <NuxtLink
              class="auth-button auth-ghost"
              to="/"
            >返回首页</NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>User Console</h3>
        <p>独立用户后台，仅管理当前账号的 API 密钥。</p>
        <div class="auth-chip">
          Create · Delete · Reset
        </div>
      </div>
    </div>
  </div>
</template>
