<script lang="ts" setup>
const { settings } = useSiteSettings()

defineProps<{
  /** 紧凑模式：隐藏右侧 hero 面板（仅在某些场景下使用，如管理员登录） */
  compact?: boolean
}>()
</script>

<template>
  <div
    class="auth-shell"
    :class="{ 'auth-shell--compact': compact }"
  >
    <main class="auth-panel">
      <div class="auth-form-wrap">
        <slot />
      </div>
    </main>

    <aside
      v-if="!compact"
      class="auth-hero"
    >
      <slot name="hero">
        <div class="auth-hero-card">
          <div class="auth-hero-card__brand">
            <div class="auth-hero-card__logo">
              <Icon
                name="i-mdi-api"
                size="22"
              />
            </div>
            <span class="auth-hero-card__brand-name">{{ settings.siteName }}</span>
          </div>
          <h3>{{ settings.siteName }}</h3>
          <p>{{ settings.siteDescription }}</p>
          <div class="auth-hero-card__chips">
            <span class="auth-chip">
              <span class="auth-chip__dot" />
              免费 API 服务
            </span>
            <span class="auth-chip">
              <Icon
                name="i-mdi-flash-outline"
                size="14"
              />
              即开即用
            </span>
            <span class="auth-chip">
              <Icon
                name="i-mdi-shield-check-outline"
                size="14"
              />
              安全可靠
            </span>
          </div>

          <div class="auth-hero-card__features">
            <div class="auth-hero-feature">
              <Icon
                name="i-mdi-rocket-launch-outline"
                size="18"
              />
              <div>
                <p class="auth-hero-feature__title">
                  快速接入
                </p>
                <p class="auth-hero-feature__desc">
                  注册即可获取额度，无需复杂审批
                </p>
              </div>
            </div>
            <div class="auth-hero-feature">
              <Icon
                name="i-mdi-database-outline"
                size="18"
              />
              <div>
                <p class="auth-hero-feature__title">
                  丰富接口
                </p>
                <p class="auth-hero-feature__desc">
                  覆盖工具、生活、AI 等多种场景
                </p>
              </div>
            </div>
            <div class="auth-hero-feature">
              <Icon
                name="i-mdi-chart-line"
                size="18"
              />
              <div>
                <p class="auth-hero-feature__title">
                  可视统计
                </p>
                <p class="auth-hero-feature__desc">
                  实时调用监控，开箱即用的仪表盘
                </p>
              </div>
            </div>
          </div>
        </div>
      </slot>
    </aside>
  </div>
</template>
