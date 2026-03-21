<script lang="ts" setup>
definePageMeta({ middleware: 'auth-admin' })
</script>

<template>
  <div class="auth-shell">
    <div class="auth-panel">
      <div
        class="auth-card"
        style="width:min(980px, 96vw);"
      >
        <h1 class="auth-title">
          管理员控制台
        </h1>
        <p class="auth-subtitle">
          按模块拆分的管理后台：用户、API Key、友情链接、接口管理、调用统计。
        </p>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/admin/users"
          >
            <div class="font-semibold">用户管理</div>
            <div class="text-sm text-muted mt-1">查看、编辑、封禁、删除用户，以及管理用户 API Key。</div>
          </NuxtLink>
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/admin/apis"
          >
            <div class="font-semibold">接口管理</div>
            <div class="text-sm text-muted mt-1">管理 API 信息、启停接口、启用或停用统计。</div>
          </NuxtLink>
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/admin/friend-links"
          >
            <div class="font-semibold">友情链接</div>
            <div class="text-sm text-muted mt-1">新增、修改、删除友情链接。</div>
          </NuxtLink>
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/admin/fab-menu"
          >
            <div class="font-semibold">FAB 菜单</div>
            <div class="text-sm text-muted mt-1">管理首页右下角的快速导航菜单。</div>
          </NuxtLink>
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/admin/calls"
          >
            <div class="font-semibold">调用统计</div>
            <div class="text-sm text-muted mt-1">查看 API 调用日志与调用统计数据。</div>
          </NuxtLink>
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/user/apikeys"
          >
            <div class="font-semibold">用户后台</div>
            <div class="text-sm text-muted mt-1">用户自助管理自己的 API Key。</div>
          </NuxtLink>
          <NuxtLink
            class="p-4 rounded-[14px] border border-border bg-white hover:bg-bg transition-colors"
            to="/"
          >
            <div class="font-semibold">返回首页</div>
            <div class="text-sm text-muted mt-1">回到公开 API 首页。</div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="auth-hero">
      <div class="auth-hero-card">
        <h3>Admin Modules</h3>
        <p>模块化后台更适合单管理员 + 多用户模型。</p>
        <div class="auth-chip">
          Dashboard · Split Modules
        </div>
      </div>
    </div>
  </div>
</template>
