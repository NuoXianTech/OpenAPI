<script setup lang="ts">
const props = defineProps<{
  dirty: boolean
  saving?: boolean
  changedCount?: number
}>()

const emit = defineEmits<{
  save: []
  reset: []
}>()

onKeyStroke(['s', 'S'], (e) => {
  if (!(e.ctrlKey || e.metaKey)) return
  if (!props.dirty || props.saving) return
  e.preventDefault()
  emit('save')
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-3"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-3"
  >
    <div
      v-if="dirty"
      role="region"
      aria-label="保存设置工具栏"
      class="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-default bg-default/85 supports-[backdrop-filter]:bg-default/70 backdrop-blur px-4 py-3 shadow-lg shadow-black/5 dark:shadow-black/30"
    >
      <div class="flex items-center gap-2 text-sm">
        <span class="relative inline-flex size-2">
          <span class="absolute inset-0 rounded-full bg-warning/40 animate-ping" />
          <span class="relative inline-flex size-2 rounded-full bg-warning" />
        </span>
        <span class="text-muted">
          有<span class="mx-0.5 font-medium text-default">{{ changedCount ?? 0 }}</span>项未保存的修改
        </span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          :disabled="saving"
          @click="emit('reset')"
        >
          放弃
        </UButton>
        <UButton
          icon="i-mdi-content-save-outline"
          :loading="saving"
          :disabled="!dirty"
          @click="emit('save')"
        >
          保存设置
        </UButton>
      </div>
    </div>
  </Transition>
</template>
