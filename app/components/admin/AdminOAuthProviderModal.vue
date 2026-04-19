<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { OAUTH_PROVIDER_PRESETS, SUPPORTED_OAUTH_PROVIDERS, type SupportedOauthProvider } from '~~/shared/types/oauth'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ item?: any }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const isEdit = computed(() => !!props.item)

const providerOptions = SUPPORTED_OAUTH_PROVIDERS.map(p => ({
  label: OAUTH_PROVIDER_PRESETS[p].displayName,
  value: p,
}))

const schema = z.object({
  provider: z.enum(SUPPORTED_OAUTH_PROVIDERS),
  displayName: z.string().min(1, '必填').max(80),
  icon: z.string().optional(),
  clientId: z.string().min(1, '必填'),
  clientSecret: z.string().optional(),
  scopesText: z.string().optional(),
  callbackUrl: z.string().min(1, '必填'),
  authorizeUrl: z.string().optional(),
  tokenUrl: z.string().optional(),
  userInfoUrl: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().default(0),
  isEnabled: z.boolean().default(false),
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  provider: 'github',
  displayName: '',
  icon: '',
  clientId: '',
  clientSecret: '',
  scopesText: '',
  callbackUrl: '',
  authorizeUrl: '',
  tokenUrl: '',
  userInfoUrl: '',
  description: '',
  sortOrder: 0,
  isEnabled: false,
})
const loading = ref(false)

function applyPreset(provider: SupportedOauthProvider) {
  const preset = OAUTH_PROVIDER_PRESETS[provider]
  if (!state.displayName) {
    state.displayName = preset.displayName
  }
  if (!state.icon) {
    state.icon = preset.icon
  }
  if (!state.scopesText) {
    state.scopesText = preset.scopes.join(',')
  }
  if (!state.authorizeUrl) {
    state.authorizeUrl = preset.authorizeUrl
  }
  if (!state.tokenUrl) {
    state.tokenUrl = preset.tokenUrl
  }
  if (!state.userInfoUrl) {
    state.userInfoUrl = preset.userInfoUrl
  }
}

watch(() => state.provider, (val) => {
  if (!isEdit.value && val) {
    applyPreset(val as SupportedOauthProvider)
  }
})

watch(() => props.item, (val) => {
  if (val) {
    Object.assign(state, {
      provider: val.provider || 'github',
      displayName: val.displayName || '',
      icon: val.icon || '',
      clientId: val.clientId || '',
      clientSecret: '',
      scopesText: Array.isArray(val.scopes) ? val.scopes.join(',') : '',
      callbackUrl: val.callbackUrl || '',
      authorizeUrl: val.authorizeUrl || '',
      tokenUrl: val.tokenUrl || '',
      userInfoUrl: val.userInfoUrl || '',
      description: val.description || '',
      sortOrder: val.sortOrder ?? 0,
      isEnabled: val.isEnabled ?? false,
    })
  }
  else {
    Object.assign(state, {
      provider: 'github',
      displayName: '',
      icon: '',
      clientId: '',
      clientSecret: '',
      scopesText: '',
      callbackUrl: '',
      authorizeUrl: '',
      tokenUrl: '',
      userInfoUrl: '',
      description: '',
      sortOrder: 0,
      isEnabled: false,
    })
    applyPreset('github')
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const data = event.data
  const scopes = (data.scopesText || '').split(',').map(s => s.trim()).filter(Boolean)
  loading.value = true
  try {
    if (isEdit.value) {
      const body: Record<string, unknown> = {
        id: props.item.id,
        displayName: data.displayName,
        icon: data.icon || null,
        clientId: data.clientId,
        scopes,
        callbackUrl: data.callbackUrl,
        authorizeUrl: data.authorizeUrl || null,
        tokenUrl: data.tokenUrl || null,
        userInfoUrl: data.userInfoUrl || null,
        description: data.description || null,
        sortOrder: data.sortOrder,
        isEnabled: data.isEnabled,
      }
      if (data.clientSecret) {
        body.clientSecret = data.clientSecret
      }
      await $fetch('/api/admin/oauth-providers/update', { method: 'PUT', body })
    }
    else {
      if (!data.clientSecret) {
        toast.add({ title: 'clientSecret 必填', color: 'error' })
        loading.value = false
        return
      }
      await $fetch('/api/admin/oauth-providers/add', {
        method: 'POST',
        body: {
          provider: data.provider,
          displayName: data.displayName,
          icon: data.icon || null,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          scopes,
          callbackUrl: data.callbackUrl,
          authorizeUrl: data.authorizeUrl || null,
          tokenUrl: data.tokenUrl || null,
          userInfoUrl: data.userInfoUrl || null,
          description: data.description || null,
          sortOrder: data.sortOrder,
          isEnabled: data.isEnabled,
        },
      })
    }
    toast.add({ title: isEdit.value ? '更新成功' : '创建成功', color: 'success' })
    open.value = false
    emit('saved')
  }
  catch (err: any) {
    toast.add({ title: err?.data?.message || '操作失败', color: 'error' })
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-auto">
        <h3 class="text-lg font-semibold mb-4">
          {{ isEdit ? '编辑第三方登录' : '新增第三方登录' }}
        </h3>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-3"
          @submit="onSubmit"
        >
          <div class="grid grid-cols-2 gap-3">
            <UFormField
              label="Provider 标识"
              name="provider"
              :description="isEdit ? '不可修改' : '仅支持 github / qq'"
            >
              <USelect
                v-model="state.provider"
                :items="providerOptions"
                :disabled="isEdit"
                placeholder="选择 Provider"
              />
            </UFormField>
            <UFormField
              label="显示名称"
              name="displayName"
            >
              <UInput
                v-model="state.displayName"
                placeholder="GitHub"
              />
            </UFormField>
          </div>
          <UFormField
            label="图标 (icon name)"
            name="icon"
          >
            <UInput
              v-model="state.icon"
              placeholder="i-mdi-github"
            />
          </UFormField>
          <UFormField
            label="Client ID"
            name="clientId"
          >
            <UInput
              v-model="state.clientId"
              placeholder="Ov23li..."
            />
          </UFormField>
          <UFormField
            label="Client Secret"
            name="clientSecret"
            :description="isEdit ? '留空保持不变，填写则覆盖' : '必填，加密后存储'"
          >
            <UInput
              v-model="state.clientSecret"
              type="password"
              placeholder="••••••••"
            />
          </UFormField>
          <UFormField
            label="Scopes (逗号分隔)"
            name="scopesText"
          >
            <UInput
              v-model="state.scopesText"
              placeholder="read:user,user:email"
            />
          </UFormField>
          <UFormField
            label="Callback URL"
            name="callbackUrl"
          >
            <UInput
              v-model="state.callbackUrl"
              placeholder="https://site.example/api/auth/oauth/github/callback"
            />
          </UFormField>
          <div class="grid grid-cols-1 gap-3">
            <UFormField
              label="Authorize URL"
              name="authorizeUrl"
            >
              <UInput
                v-model="state.authorizeUrl"
                placeholder="https://github.com/login/oauth/authorize"
              />
            </UFormField>
            <UFormField
              label="Token URL"
              name="tokenUrl"
            >
              <UInput
                v-model="state.tokenUrl"
                placeholder="https://github.com/login/oauth/access_token"
              />
            </UFormField>
            <UFormField
              label="UserInfo URL"
              name="userInfoUrl"
            >
              <UInput
                v-model="state.userInfoUrl"
                placeholder="https://api.github.com/user"
              />
            </UFormField>
          </div>
          <UFormField
            label="描述"
            name="description"
          >
            <UTextarea
              v-model="state.description"
              :rows="2"
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-3 items-end">
            <UFormField
              label="排序"
              name="sortOrder"
            >
              <UInput
                v-model.number="state.sortOrder"
                type="number"
              />
            </UFormField>
            <USwitch
              v-model="state.isEnabled"
              label="启用"
            />
          </div>
          <div class="flex justify-end gap-2 pt-3">
            <UButton
              variant="outline"
              color="neutral"
              @click="open = false"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              :loading="loading"
            >
              {{ isEdit ? '保存' : '创建' }}
            </UButton>
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
