<script setup lang="ts">
import type { DiscoveredEndpoint } from '#shared/types/api'
import ApiHttpMethodBadge from '~/components/api/HttpMethodBadge.vue'

const props = defineProps<{
  endpoints: DiscoveredEndpoint[]
}>()

const firstEndpoint = computed(() => props.endpoints[0] ?? null)
const remainingCount = computed(() => Math.max(0, props.endpoints.length - 1))
</script>

<template>
  <div
    v-if="firstEndpoint"
    class="flex min-w-0 max-w-full items-center gap-2"
  >
    <ApiHttpMethodBadge
      :method="firstEndpoint.method"
      size="xs"
    />
    <code
      class="min-w-0 flex-1 truncate font-mono text-xs font-medium text-highlighted"
      :title="firstEndpoint.apiPath"
    >
      {{ firstEndpoint.apiPath }}
    </code>

    <UPopover
      v-if="remainingCount"
      :content="{ align: 'start', side: 'bottom', sideOffset: 8 }"
    >
      <UButton
        :label="`+${remainingCount}`"
        :aria-label="$t('admin.apis.form.modal.endpointCount', { count: endpoints.length })"
        color="neutral"
        variant="soft"
        size="xs"
        class="shrink-0 font-mono"
      />

      <template #content>
        <div class="w-80 max-w-[calc(100vw-2rem)] p-3 sm:w-96">
          <div class="mb-2.5 flex items-center justify-between gap-3">
            <span class="text-xs font-semibold text-highlighted">
              {{ $t('admin.apis.form.endpoints.title') }}
            </span>
            <span class="font-mono text-[11px] text-muted">
              {{ endpoints.length }}
            </span>
          </div>

          <div class="max-h-72 space-y-1 overflow-y-auto pe-1">
            <div
              v-for="endpoint in endpoints"
              :key="`${endpoint.method}-${endpoint.apiPath}`"
              class="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-muted bg-elevated px-2.5 py-2"
            >
              <ApiHttpMethodBadge
                :method="endpoint.method"
                size="xs"
              />
              <code
                class="min-w-0 truncate font-mono text-xs text-toned"
                :title="endpoint.apiPath"
              >
                {{ endpoint.apiPath }}
              </code>
              <UBadge
                v-if="endpoint.isDynamic"
                color="neutral"
                variant="soft"
                size="sm"
              >
                {{ $t('admin.apis.form.endpoints.dynamic') }}
              </UBadge>
            </div>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
