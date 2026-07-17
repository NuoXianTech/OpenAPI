<script setup lang="ts">
import type { OauthBinding } from '~/composables/user/use-user-settings-page'

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
const { locale } = useI18n()
</script>

<template>
  <DashboardSettingsSection
    :title="$t('user.settings.oauth.title')"
  >
    <template #actions>
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-mdi-refresh"
        :loading="loading"
        @click="emit('refresh')"
      />
    </template>

    <div
      v-if="!enabled && list.length === 0"
      class="text-sm text-muted py-4 text-center"
    >
      {{ $t('user.settings.oauth.disabled') }}
    </div>
    <div
      v-else-if="list.length === 0"
      class="text-sm text-muted py-4 text-center"
    >
      {{ $t('user.settings.oauth.empty') }}
    </div>
    <template v-else>
      <div
        v-for="item in list"
        :key="item.provider"
        class="flex items-center justify-between gap-3"
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
                {{ $t('user.settings.oauth.status.bound') }}
              </UBadge>
              <UBadge
                v-else-if="item.enabled"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ $t('user.settings.oauth.status.unbound') }}
              </UBadge>
              <UBadge
                v-else
                color="warning"
                variant="subtle"
                size="sm"
              >
                {{ $t('user.settings.oauth.status.disabled') }}
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
              >· {{ $t('user.settings.oauth.linkedAt', { time: formatDateTime(item.linkedAt, '-', locale) }) }}</span>
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
            {{ $t('user.settings.oauth.actions.unbind') }}
          </UButton>
          <UButton
            v-else-if="item.enabled"
            size="sm"
            variant="outline"
            @click="emit('bind', item.provider)"
          >
            {{ $t('user.settings.oauth.actions.bind') }}
          </UButton>
        </div>
      </div>
    </template>
  </DashboardSettingsSection>
</template>
