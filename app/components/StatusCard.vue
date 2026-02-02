<template>
  <section
    class="mb-2 text-[13px] text-muted flex flex-col gap-1.5 bg-surface border border-border rounded-xl p-3 relative overflow-hidden select-none"
  >
    <div class="absolute left-0 top-0 bottom-0 w-0.75 bg-text opacity-10"></div>

    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 opacity-75">
        <span
          class="iconify"
          data-icon="mdi:clock-outline"
          data-width="14"
        ></span>
        当前时间：
      </span>
      <span class="font-mono font-bold text-text tracking-wide">
        {{ nowTime }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 opacity-75">
        <span
          class="iconify"
          data-icon="mdi:server-outline"
          data-width="14"
        ></span>
        稳定运行：
      </span>
      <span class="font-mono font-bold text-text tracking-wide">
        {{ upTime }}
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const nowTime = ref("");
const upTime = ref("");

const props = defineProps({
  startTime: {
    type: String,
    default: "2026-01-01 00:00:00",
  },
});

let timer: number | undefined;
const startTime = new Date(props.startTime).getTime();

function formatNowTime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function formatUpTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分 ${seconds}秒`;
  }
  if (hours > 0) {
    return `${hours}小时 ${minutes}分 ${seconds}秒`;
  }
  return `${minutes}分 ${seconds}秒`;
}

onMounted(() => {
  // 初始化
  nowTime.value = formatNowTime();
  upTime.value = formatUpTime(0);

  timer = window.setInterval(() => {
    nowTime.value = formatNowTime();
    upTime.value = formatUpTime(Date.now() - startTime);
  }, 1000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>
