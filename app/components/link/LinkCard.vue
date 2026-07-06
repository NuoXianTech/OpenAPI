<script setup lang="ts">
interface LinkCardProps {
  title?: string
  description?: string
  url?: string
  status?: number
}

const props = withDefaults(defineProps<LinkCardProps>(), {
  title: '链接标题',
  description: '站点描述',
  url: '#',
  status: -1
})

const displayDescription = computed(() => {
  const value = props.description?.trim()
  return value || '暂无描述'
})

const displayHost = computed(() => {
  try {
    const url = new URL(props.url)
    return url.hostname.replace(/^www\./, '')
  } catch {
    return props.url
  }
})

const displayInitial = computed(() => {
  const t = props.title.trim()
  return t ? t[0]?.toUpperCase() : '?'
})

const isActive = computed(() => props.status === 1)
</script>

<template>
  <a
    :href="props.url"
    target="_blank"
    rel="noopener"
    class="link-card group"
    :class="{ 'link-card--inactive': !isActive }"
  >
    <span
      class="link-card__spotlight"
      aria-hidden="true"
    />

    <div class="link-card__top">
      <UAvatar
        :text="displayInitial"
        size="md"
        class="link-card__avatar"
      />
      <UBadge
        :color="isActive ? 'success' : 'error'"
        variant="soft"
        size="sm"
        class="rounded-md"
      >
        <span
          class="link-card__dot"
          :class="isActive ? 'link-card__dot--ok' : 'link-card__dot--err'"
        />
        {{ isActive ? '正常' : '异常' }}
      </UBadge>
    </div>

    <div class="link-card__body">
      <h3 class="link-card__title">
        {{ props.title }}
      </h3>
      <p
        class="link-card__desc"
        :title="displayDescription"
      >
        {{ displayDescription }}
      </p>
    </div>

    <div class="link-card__footer">
      <span
        class="link-card__host"
        :title="props.url"
      >
        <UIcon
          name="i-lucide-earth"
          class="size-3"
        />
        {{ displayHost }}
      </span>
      <span class="link-card__cta">
        访问
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-3.5"
        />
      </span>
    </div>
  </a>
</template>

<style scoped>
.link-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--ui-border) 86%, transparent);
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg-elevated) 94%, var(--ui-primary) 6%) 0%,
      var(--ui-bg-elevated) 42%,
      color-mix(in srgb, var(--ui-bg) 88%, transparent) 100%);
  border-radius: 8px;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  isolation: isolate;
  min-height: 168px;
  transition: transform 240ms ease, border-color 240ms ease, box-shadow 240ms ease;
}

.dark .link-card {
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--ui-bg-elevated) 92%, var(--ui-primary) 8%) 0%,
      var(--ui-bg-elevated) 48%,
      color-mix(in srgb, var(--ui-bg) 90%, transparent) 100%);
}

.link-card::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 90px;
  height: 90px;
  background:
    radial-gradient(circle at top right,
      color-mix(in srgb, var(--ui-info) 10%, transparent),
      transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.link-card:hover {
  transform: translateY(-2px);
  border-color: var(--ui-border-accented);
  box-shadow: 0 10px 24px -10px rgba(17, 17, 19, 0.18);
}

.dark .link-card:hover {
  box-shadow: 0 10px 24px -10px rgba(0, 0, 0, 0.55);
}

.link-card__spotlight {
  position: absolute;
  inset: -1px;
  pointer-events: none;
  border-radius: inherit;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--ui-primary) 10%, transparent),
      transparent 56%);
  opacity: 0;
  transition: opacity 240ms ease;
  z-index: 0;
}

.link-card:hover .link-card__spotlight {
  opacity: 1;
}

.link-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.link-card__avatar {
  transition: transform 240ms ease;
  background: color-mix(in srgb, var(--ui-primary) 12%, transparent) !important;
  color: var(--ui-text) !important;
  border: 1px solid color-mix(in srgb, var(--ui-border) 82%, transparent);
}

.link-card:hover .link-card__avatar {
  transform: rotate(-4deg);
}

.link-card__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
  margin-right: 4px;
}

.link-card__dot--ok {
  background: var(--ui-success);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-success) 28%, transparent);
}

.link-card__dot--err {
  background: var(--ui-error);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ui-error) 28%, transparent);
}

.link-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.link-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ui-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-card__desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--ui-text-muted);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.link-card__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ui-border);
  font-size: 12px;
}

.link-card__host {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--ui-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.link-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--ui-text-muted);
  font-weight: 500;
  transition: color 200ms ease, gap 200ms ease;
  flex-shrink: 0;
}

.link-card:hover .link-card__cta {
  color: var(--ui-text);
  gap: 6px;
}

.link-card--inactive .link-card__avatar {
  background: color-mix(in srgb, var(--ui-text-muted) 18%, transparent) !important;
  color: var(--ui-text-muted) !important;
}

.link-card--inactive .link-card__title {
  color: var(--ui-text-muted);
}
</style>
