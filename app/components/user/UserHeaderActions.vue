<script setup lang="ts">
/**
 * 用户后台头部操作区：在共用的 DashboardHeaderActions 基础上挂上站内信铃铛。
 *
 * 通知是 user 专属（admin 走 env、无 users 表记录也无收件箱），所以铃铛只在 user 链路
 * 引入，不在共用组件里做角色判断。刷新入口不在用户后台 header 展示。
 */
defineProps<{
  onRefresh?: () => void | Promise<void>
  refreshing?: boolean
}>()
</script>

<template>
  <DashboardHeaderActions>
    <CommonNotificationBell />
  </DashboardHeaderActions>
</template>
