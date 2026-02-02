<script setup>
const { nowTime, upTime, startClock } = useSiteTime();

onMounted(() => {
  startClock();
});
</script>

<template>
  <section class="mb-2 text-[13px] text-muted flex flex-col gap-1.5 bg-surface border border-border rounded-xl p-3 relative overflow-hidden select-none">
    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-[#111113] opacity-10"></div>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 opacity-75"><span class="iconify" data-icon="mdi:clock-outline" data-width="14"></span>当前时间：</span>
      <span class="font-mono font-bold text-text tracking-wide">{{ nowTime }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 opacity-75"><span class="iconify" data-icon="mdi:server-outline" data-width="14"></span>稳定运行：</span>
      <span class="font-mono font-bold text-text tracking-wide">{{ upTime }}</span>
    </div>
  </section>
</template>