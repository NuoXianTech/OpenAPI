<script setup lang="ts">
import type { DiscoveredEndpoint } from '#shared/types/admin-api'

defineProps<{ endpoints: DiscoveredEndpoint[] }>()
</script>

<template>
  <div
    v-if="endpoints.length"
    class="mb-4 rounded-lg border border-default p-3 bg-elevated/30"
  >
    <div class="text-xs text-muted mb-2">
      发现的端点（路径与方法不可编辑，由文件结构决定）
    </div>
    <div class="flex flex-col gap-1">
      <div
        v-for="ep in endpoints"
        :key="`${ep.method}-${ep.apiPath}`"
        class="flex items-center gap-2 text-sm"
      >
        <UBadge
          variant="subtle"
          class="font-mono"
        >
          {{ ep.method }}
        </UBadge>
        <span class="font-mono">{{ ep.apiPath }}</span>
        <span
          v-if="ep.isDynamic"
          class="text-xs text-primary"
        >动态</span>
      </div>
    </div>
  </div>
</template>
