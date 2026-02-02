<script setup>
// 定义这个组件接收什么数据
const props = defineProps({
  data: Object
});

const isExpanded = ref(false);

const getStatusInfo = (status) => {
  switch (parseInt(status)) {
    case 0: return { class: 'status-error', text: '异常' };
    case -1: return { class: 'status-unknown', text: '未知' };
    default: return { class: '', text: '正常' };
  }
};
</script>

<template>
  <article class="col-span-12 sm:col-span-6 lg:col-span-4 bg-surface border border-border rounded-[14px] shadow-[0_6px_16px_rgba(0,0,0,0.06)] p-4 flex flex-col transition-all duration-300 card-enter">
    <div class="flex items-center justify-between gap-2 shrink-0">
      <h2 class="text-base m-0 ml-1.5 flex-1 font-bold">{{ data.name }}</h2>
      <div class="radar-core" :class="getStatusInfo(data.status).class" :title="getStatusInfo(data.status).text"></div>
    </div>
    
    <p class="text-muted text-sm my-2 mb-3 line-clamp-3 overflow-hidden text-ellipsis min-h-[1.5em] leading-[1.5] shrink-0">
      {{ data.description }}
    </p>

    <div class="flex items-center justify-between gap-2.5 bg-bg border border-border rounded-[10px] p-2 mb-2.5 shrink-0">
      <div class="flex items-baseline gap-2 min-w-0 flex-1">
        <span class="text-xs font-mono text-text overflow-hidden text-ellipsis whitespace-nowrap">{{ data.url }}</span>
      </div>
      <a :href="data.url" target="_blank" class="bg-surface border border-border text-text rounded-lg p-1.5 cursor-pointer leading-none shrink-0 hover:brightness-95 flex items-center justify-center">
        <span class="iconify w-4 h-4" data-icon="mdi:external-link"></span>
      </a>
    </div>

    <button class="inline-flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5 cursor-pointer select-none text-xs ml-auto w-fit shrink-0 hover:brightness-95 transition-colors" @click="isExpanded = !isExpanded">
      <span class="iconify w-3.5 h-3.5 transition-transform duration-300" :class="isExpanded ? 'rotate-90' : ''" data-icon="mdi:chevron-right"></span>
      <span>{{ isExpanded ? '收起详情' : '查看详情' }}</span>
    </button>

    <div class="overflow-hidden transition-all duration-300 ease-in-out border-t border-dashed"
          :class="isExpanded ? 'max-h-[500px] opacity-100 mt-3 pt-3 border-border' : 'max-h-0 opacity-0 mt-0 pt-0 border-transparent'">
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">请求方法</div>
        <div class="text-[13px] font-mono break-all">{{ data.method || 'GET' }}</div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">接口描述</div>
        <div class="text-[13px] break-all">{{ data.description }}</div>
      </div>
    </div>
  </article>
</template>