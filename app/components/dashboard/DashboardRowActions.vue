<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * 后台表格行操作菜单：统一“⋮”触发按钮 + 右对齐下拉。
 * 各列表页的 #actions-cell 收敛到此，避免重复同款 div / UDropdownMenu / UButton。
 */
defineProps<{
  items: DropdownMenuItem[] | DropdownMenuItem[][]
}>()
</script>

<template>
  <div class="text-right">
    <UDropdownMenu
      :items="items"
      :content="{ align: 'end' }"
    >
      <UButton
        icon="i-lucide-ellipsis-vertical"
        color="neutral"
        variant="ghost"
        size="sm"
      />
    </UDropdownMenu>
  </div>
</template>
