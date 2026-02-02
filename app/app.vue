<script setup>
const { 
  isLoading, 
  searchQuery, 
  currentTab, 
  currentPage, 
  totalPages, 
  paginatedData,
  filteredData,
  fetchData, 
  changePage, 
  switchTab 
} = useApiData();

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="min-h-screen pb-10">
    <!-- 1. 头部组件 -->
    <AppHeader />

    <main class="max-w-[1100px] mx-auto px-5 pb-6">
      <!-- 2. 状态卡片组件 -->
      <StatusCard />

      <!-- 搜索栏 -->
      <section class="flex flex-wrap gap-3 mt-4 mb-3">
        <input 
          v-model="searchQuery"
          type="search" 
          class="appearance-none outline-none rounded-[10px] border border-border bg-white text-[#111113] px-3 py-2.5 min-h-[40px] text-base flex-[1_1_260px] transition-all duration-200 focus:border-[#8ab4ff] focus:shadow-[0_0_0_3px_rgba(138,180,255,0.25)]" 
          placeholder="搜索 API 名称或描述..." 
        />
      </section>

      <!-- 筛选标签 -->
      <section class="flex flex-wrap gap-2 mb-6">
        <button 
          v-for="tab in [
            { id: 'all', label: '全部' },
            { id: '1', label: '正常' },
            { id: '0', label: '异常' },
            { id: '-1', label: '未知' }
          ]"
          :key="tab.id"
          @click="switchTab(tab.id)"
          class="px-3.5 py-1.5 rounded-lg text-sm border transition-all duration-200 cursor-pointer select-none font-medium"
          :class="currentTab === tab.id 
            ? (tab.id === 'all' ? 'bg-[#111113] text-white border-[#111113]' : 
               tab.id === '1' ? 'bg-green-600 text-white border-green-600' :
               tab.id === '0' ? 'bg-red-500 text-white border-red-500' :
               'bg-slate-500 text-white border-slate-500')
            : 'bg-surface border-border text-muted hover:text-text hover:border-muted/50'"
        >
          {{ tab.label }}
        </button>
      </section>

      <!-- 状态：加载中 -->
      <section v-if="isLoading" class="py-6 grid grid-cols-12 gap-4">
        <div v-for="n in 6" :key="n" class="col-span-12 sm:col-span-6 lg:col-span-4 h-[140px] skeleton-bg border border-border rounded-custom shadow-[0_6px_16px_rgba(0,0,0,0.06)]"></div>
      </section>

      <!-- 状态：空结果 -->
      <section v-else-if="filteredData.length === 0" class="py-6">
        <div class="bg-surface border border-border rounded-custom shadow-[0_6px_16px_rgba(0,0,0,0.06)] p-5 text-center my-2 card-enter">
          <div class="font-semibold">未找到匹配的 API</div>
          <div class="text-muted text-[13px] mt-1">尝试调整搜索关键词或切换筛选标签。</div>
        </div>
      </section>

      <!-- 列表内容区 -->
      <section v-else>
        <div class="grid grid-cols-12 gap-4 items-start">
          <!-- 3. API卡片组件 (循环使用) -->
          <ApiItem 
            v-for="(item, index) in paginatedData" 
            :key="index"
            :data="item"
            :style="{ animationDelay: index * 50 + 'ms' }"
          />
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-4 mt-8 py-2 select-none">
          <button class="bg-surface border border-border px-4 py-2 rounded-lg text-sm hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed" 
                  @click="changePage(-1)" :disabled="currentPage === 1">上一页</button>
          <span class="text-sm text-muted font-mono">第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
          <button class="bg-surface border border-border px-4 py-2 rounded-lg text-sm hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed" 
                  @click="changePage(1)" :disabled="currentPage === totalPages">下一页</button>
        </div>
      </section>
    </main>
    
    <!-- 4. 悬浮菜单组件 -->
    <FabMenu />

    <!-- 5. 页脚组件 -->
    <AppFooter />
  </div>
</template>