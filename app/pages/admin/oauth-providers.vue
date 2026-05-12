<script setup lang="ts">
import { SUPPORTED_OAUTH_PROVIDERS } from '~~/shared/types/oauth'

definePageMeta({ layout: 'admin', middleware: 'auth-admin' })

interface ProviderItem {
  provider: string
  displayName: string
  icon: string
  scopes: string[]
  clientId: string
  clientSecret: string
  isEnabled: boolean
  callbackUrl: string
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
}

interface ProviderForm {
  clientId: string
  clientSecret: string
  isEnabled: boolean
  saving: boolean
  copied: boolean
}

const toast = useToast()

const { data, status, refresh } = useLazyFetch<ProviderItem[]>('/api/admin/oauth-providers/list', {
  default: () => [] as ProviderItem[],
})

const items = computed<ProviderItem[]>(() => data.value || [])

function createForm(): ProviderForm {
  return { clientId: '', clientSecret: '', isEnabled: false, saving: false, copied: false }
}

const forms = reactive<Record<string, ProviderForm>>(
  Object.fromEntries(SUPPORTED_OAUTH_PROVIDERS.map(p => [p, createForm()])),
)

function getForm(provider: string): ProviderForm {
  let form = forms[provider]
  if (!form) {
    form = createForm()
    forms[provider] = form
  }
  return form
}

watch(items, (list) => {
  for (const item of list) {
    const form = getForm(item.provider)
    form.clientId = item.clientId || ''
    form.clientSecret = ''
    form.isEnabled = item.isEnabled
  }
}, { immediate: true })

async function save(item: ProviderItem) {
  const form = getForm(item.provider)
  form.saving = true
  try {
    const body: Record<string, unknown> = {
      provider: item.provider,
      clientId: form.clientId,
      isEnabled: form.isEnabled,
    }
    if (form.clientSecret) {
      body.clientSecret = form.clientSecret
    }
    await $fetch('/api/admin/oauth-providers/update', { method: 'PUT', body })
    toast.add({ title: `${item.displayName} 保存成功`, color: 'success' })
    form.clientSecret = ''
    await refresh()
  }
  catch (err: unknown) {
    toast.add({ title: (err as { data?: { message?: string } })?.data?.message || '保存失败', color: 'error' })
  }
  finally {
    form.saving = false
  }
}

async function copyCallback(item: ProviderItem) {
  const form = getForm(item.provider)
  try {
    await navigator.clipboard.writeText(item.callbackUrl)
    form.copied = true
    setTimeout(() => {
      form.copied = false
    }, 1500)
  }
  catch {
    toast.add({ title: '复制失败，请手动选中复制', color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel id="admin-oauth-providers">
    <template #header>
      <UDashboardNavbar title="第三方登录">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <DashboardHeaderActions
            :on-refresh="refresh"
            :refreshing="status === 'pending'"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div
        v-if="status === 'pending' && items.length === 0"
        class="grid gap-4 md:grid-cols-2"
      >
        <USkeleton
          v-for="i in 2"
          :key="i"
          class="h-80 w-full"
        />
      </div>
      <div
        v-else
        class="grid gap-4 md:grid-cols-2"
      >
        <UCard
          v-for="item in items"
          :key="item.provider"
          class="h-full"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                :name="item.icon"
                class="text-xl"
              />
              <div class="flex flex-col">
                <span class="font-semibold">{{ item.displayName }}</span>
                <span class="text-xs text-muted">provider: {{ item.provider }}</span>
              </div>
              <UBadge
                class="ml-auto"
                :color="item.isEnabled ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ item.isEnabled ? '启用' : '停用' }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-3">
            <UFormField label="Client ID">
              <UInput
                v-model="getForm(item.provider).clientId"
                placeholder="填写 OAuth App 的 Client ID"
              />
            </UFormField>
            <UFormField
              label="Client Secret"
              :description="item.clientSecret ? '已保存。留空则保持不变，填写则覆盖。' : '首次保存，必填。'"
            >
              <UInput
                v-model="getForm(item.provider).clientSecret"
                type="password"
                placeholder="••••••••"
              />
            </UFormField>
            <UFormField
              label="Callback URL"
              description="由站点地址自动拼接，不可修改。请把该地址填到 OAuth App 的回调白名单。"
            >
              <div class="flex gap-2">
                <UInput
                  :model-value="item.callbackUrl"
                  readonly
                  class="flex-1"
                />
                <UButton
                  :icon="getForm(item.provider).copied ? 'i-mdi-check' : 'i-mdi-content-copy'"
                  :color="getForm(item.provider).copied ? 'success' : 'neutral'"
                  variant="outline"
                  @click="copyCallback(item)"
                >
                  {{ getForm(item.provider).copied ? '已复制' : '复制' }}
                </UButton>
              </div>
            </UFormField>
            <UFormField
              label="Scopes"
              description="已按 provider 固定，无需配置。"
            >
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="s in item.scopes"
                  :key="s"
                  variant="subtle"
                  color="neutral"
                >
                  {{ s }}
                </UBadge>
                <span
                  v-if="!item.scopes.length"
                  class="text-xs text-muted"
                >（无）</span>
              </div>
            </UFormField>

            <USwitch
              v-model="getForm(item.provider).isEnabled"
              label="启用该登录方式"
            />
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                :loading="getForm(item.provider).saving"
                @click="save(item)"
              >
                保存
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
