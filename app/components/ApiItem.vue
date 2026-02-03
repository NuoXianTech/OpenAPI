<script lang="ts" setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  name: {
    type: String,
    default: "这是标题标题标题",
  },
  status: {
    type: Number,
    default: -1,
  },
  short_desc: {
    type: String,
    default: "这是简短描述",
  },
  description: {
    type: String,
    default: "这是详细描述详细描述详细描述详细描述",
  },
  http_method: {
    type: String,
    default: "GET",
  },
  api_path: {
    type: String,
    default: "/api/v1/path",
  },
  doc_url: {
    type: String,
    default: "https://example.com/docs",
  },
});

const isExpanded = ref(false);

const getStatusInfo = (status: any) => {
  switch (parseInt(status)) {
    case -1:
      return { class: "status-unknown", text: "未知" };
    case 0:
      return { class: "status-error", text: "异常" };
    case 2:
      return { class: "status-unknown", text: "维护" };
    case 3:
      return { class: "status-unknown", text: "废弃" };
    default:
      return { class: "status-normal", text: "正常" };
  }
};
</script>

<template>
  <article
    class="col-span-12 sm:col-span-6 lg:col-span-4 bg-surface border border-border rounded-custom shadow-[0_6px_16px_rgba(0,0,0,0.06)] p-4 flex flex-col transition-all duration-300 card-enter"
  >
    <div class="flex items-center justify-between gap-2 shrink-0">
      <h2 class="text-base m-0 ml-1.5 flex-1 font-bold">
        {{ props.name }}
      </h2>
      <div
        class="radar-core"
        :class="getStatusInfo(props.status).class"
        :title="getStatusInfo(props.status).text"
      ></div>
    </div>

    <p class="text-muted text-sm my-2 line-clamp-3 overflow-hidden text-ellipsis min-h-[1.5em] leading-normal shrink-0">
      {{ props.short_desc }}
    </p>

    <div class="flex items-center justify-between gap-2.5 bg-grey border border-border rounded-[10px] p-2 mt-2.5 mb-2.5 shrink-0">
      <div class="flex items-baseline gap-2 min-w-0 flex-1">
        <span class="inline-flex items-center gap-1.5 text-xs font-mono text-text overflow-hidden text-ellipsis whitespace-nowrap">
          <Icon icon="mdi:file-document-multiple-outline" width="16" :ssr="true"/>
          {{ props.doc_url }}
        </span>
      </div>
      <a
        :href="props.doc_url"
        target="_blank"
        class="bg-surface border border-border text-text rounded-lg p-1.5 cursor-pointer leading-none shrink-0 hover:brightness-95 flex items-center justify-center"
      >
        <Icon icon="mdi:external-link" width="16" :ssr="true" />
      </a>
    </div>

    <button
      class="inline-flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-1.5 cursor-pointer select-none text-xs ml-auto w-fit shrink-0 hover:brightness-95 transition-colors"
      @click="isExpanded = !isExpanded"
    >
      <Icon icon="mdi:chevron-right" width="16" :class="isExpanded ? 'rotate-90' : ''" :ssr="true"/>
      <span>
        {{ isExpanded ? "收起详情" : "查看详情" }}
        <!-- TODO: 此处应当有图标的过渡效果 -->
      </span>
    </button>

    <div
      class="overflow-hidden transition-all duration-300 ease-in-out border-t border-dashed"
      :class="
        isExpanded
          ? 'max-h-125 opacity-100 mt-3 pt-3 border-border'
          : 'max-h-0 opacity-0 mt-0 pt-0 border-transparent'
      "
    >
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">接口示例</div>
        <div class="text-[13px] break-all">
          {{ props.api_path }}
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">请求方法</div>
        <div class="text-[13px] font-mono break-all">
          {{ props.http_method }}
          <!-- TODO: 此处应当支持多个请求类型，例如：GET,POST，并以,作为分隔符，类似于Tag标签圆角样式 -->
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">调用次数</div>
        <div class="text-[13px] font-mono break-all">
          100万
          <!-- TODO: 当前接口调用次数，例如：100，1千，1万，10.5万，100万 -->
        </div>
      </div>
      <div class="grid grid-cols-[90px_1fr] gap-2.5 items-start py-1">
        <div class="text-muted text-xs">接口描述</div>
        <div class="text-[13px] break-all">
          {{ props.description }}
        </div>
      </div>
    </div>
  </article>
</template>
