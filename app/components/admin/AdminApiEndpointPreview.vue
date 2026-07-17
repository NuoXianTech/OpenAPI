<script setup lang="ts">
import type { DiscoveredEndpoint } from '#shared/types/api'

defineProps<{ endpoints: DiscoveredEndpoint[] }>()
</script>

<template>
  <div
    v-if="endpoints.length"
    class="mb-4 rounded-xl border border-default bg-muted/30 p-4"
  >
    <div class="mb-3 flex items-center gap-2 text-xs text-muted">
      <UIcon name="i-mdi-source-branch" class="size-4" />
      <span>{{ $t('admin.apis.form.endpoints.title') }}</span>
      <span class="ms-auto">{{ $t('admin.apis.form.endpoints.description') }}</span>
    </div>
    <div class="flex flex-col gap-1">
      <div
        v-for="ep in endpoints"
        :key="`${ep.method}-${ep.apiPath}`"
        class="grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-default/60 bg-default px-3 py-2.5"
      >
        <UBadge
          color="neutral"
          variant="soft"
          class="w-fit min-w-12 justify-center font-mono text-[11px] font-semibold"
        >
          {{ ep.method.toUpperCase() }}
        </UBadge>
        <code class="min-w-0 truncate font-mono text-xs font-medium text-highlighted">
          {{ ep.apiPath }}
        </code>
        <UBadge
          v-if="ep.isDynamic"
          color="primary"
          variant="subtle"
          size="sm"
        >
          {{ $t('admin.apis.form.endpoints.dynamic') }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
