<script setup lang="ts">
import type { OauthBinding } from '~/composables/user/useUserSettingsPage'

defineProps<{
  list: OauthBinding[]
  enabled: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  bind: [provider: string]
  unbind: [provider: string]
}>()

function formatDate(iso: string | null) {
  return formatDateTime(iso)
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-start justify-between gap-4">
      <UPageCard
        title="第三方账号"
        description="绑定后可使用第三方账号快捷登录，也可随时解绑。"
        variant="naked"
        class="flex-1"
      />
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-mdi-refresh"
        :loading="loading"
        @click="emit('refresh')"
      />
    </div>

    <UPageCard
      variant="subtle"
      :ui="{ container: 'divide-y divide-default' }"
    >
      <div
        v-if="!enabled && list.length === 0"
        class="text-sm text-muted py-4 text-center"
      >
        站点已关闭第三方登录功能
      </div>
      <div
        v-else-if="list.length === 0"
        class="text-sm text-muted py-4 text-center"
      >
        暂无可用的第三方登录提供方
      </div>
      <template v-else>
        <div
          v-for="item in list"
          :key="item.provider"
          class="flex items-center justify-between gap-3 not-last:pb-4 not-first:pt-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex items-center justify-center size-10 rounded-lg bg-elevated shrink-0">
              <UIcon
                :name="item.icon"
                class="size-6"
              />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">
                  {{ item.displayName }}
                </span>
                <UBadge
                  v-if="item.bound"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  已绑定
                </UBadge>
                <UBadge
                  v-else-if="item.enabled"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  未绑定
                </UBadge>
                <UBadge
                  v-else
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  站点已关闭
                </UBadge>
              </div>
              <div
                v-if="item.bound"
                class="text-xs text-muted truncate mt-0.5"
              >
                {{ item.nickname || item.providerUserId }}
                <span
                  v-if="item.email"
                  class="ml-1"
                >· {{ item.email }}</span>
                <span
                  v-if="item.linkedAt"
                  class="ml-1"
                >· 绑定于 {{ formatDate(item.linkedAt) }}</span>
              </div>
            </div>
          </div>
          <div class="shrink-0">
            <UButton
              v-if="item.bound"
              size="sm"
              color="error"
              variant="outline"
              @click="emit('unbind', item.provider)"
            >
              解绑
            </UButton>
            <UButton
              v-else-if="item.enabled"
              size="sm"
              variant="outline"
              @click="emit('bind', item.provider)"
            >
              绑定
            </UButton>
          </div>
        </div>
      </template>
    </UPageCard>
  </div>
</template>
