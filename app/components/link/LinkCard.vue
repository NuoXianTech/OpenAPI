<script lang="ts" setup>
const props = defineProps({
  title: { type: String, default: '链接标题' },
  description: { type: String, default: '站点描述' },
  url: { type: String, default: '#' },
  status: { type: Number, default: -1 }
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
        class="rounded-full"
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
          name="i-mdi-earth"
          class="size-3"
        />
        {{ displayHost }}
      </span>
      <span class="link-card__cta">
        访问
        <UIcon
          name="i-mdi-arrow-top-right"
          class="size-3.5"
        />
      </span>
    </div>
  </a>
</template>
