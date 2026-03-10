<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: false },
  status: { type: Number, default: -1 },
  isApiKey: { type: Boolean, default: false },
  initialExpanded: { type: Boolean, default: false },
})

const isExpanded = ref(props.initialExpanded)
const toggle = () => {
  isExpanded.value = !isExpanded.value
}

const getStatusInfo = (status: number) => {
  const STATUS_UNKNOWN_CLASS = 'status-unknown'
  switch (status) {
    case -1:
      return { class: STATUS_UNKNOWN_CLASS, text: '未知' }
    case 0:
      return { class: 'status-error', text: '异常' }
    case 1:
      return { class: 'status-normal', text: '正常' }
    case 2:
      return { class: STATUS_UNKNOWN_CLASS, text: '维护' }
    case 3:
      return { class: STATUS_UNKNOWN_CLASS, text: '废弃' }
    default:
      return { class: STATUS_UNKNOWN_CLASS, text: '未知' }
  }
}
</script>

<template>
  <article class="col-span-12 sm:col-span-6 lg:col-span-4 bg-surface border border-border rounded-custom shadow-[0_6px_16px_rgba(0,0,0,0.06)] p-4 flex flex-col transition-all duration-300 card-enter">
    <div class="flex items-center justify-between gap-2 shrink-0">
      <h2 class="text-base m-0 ml-1.5 flex-1 font-bold">
        <slot name="header">
          {{ title }}
        </slot>
      </h2>

      <div class="flex items-center gap-2">
        <div
          class="radar-core"
          :class="getStatusInfo(props.status).class"
          :title="getStatusInfo(props.status).text"
        />
        <slot name="header-actions" />
      </div>
    </div>

    <div class="mt-2">
      <slot name="summary" />
    </div>

    <div class="flex items-center justify-between w-full mt-2">
      <slot name="meta" />

      <button
        class="inline-flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5 cursor-pointer select-none text-xs hover:brightness-95 transition-colors ml-auto"
        :aria-expanded="isExpanded"
        @click="toggle"
      >
        <Icon
          name="mdi:chevron-right"
          size="16"
          :class="isExpanded ? 'rotate-90' : ''"
          :ssr="true"
        />
        <span>
          <slot name="toggle-text">{{ isExpanded ? '收起详情' : '查看详情' }}</slot>
        </span>
      </button>
    </div>

    <div
      class="overflow-hidden transition-all duration-300 ease-in-out border-t border-dashed"
      :class="isExpanded ? 'max-h-125 opacity-100 mt-3 pt-3 border-border' : 'max-h-0 opacity-0 mt-0 pt-0 border-transparent'"
    >
      <slot name="details" />
    </div>
  </article>
</template>
<!-- TODO: 通用Card组件 -->
