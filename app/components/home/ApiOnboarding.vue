<script setup lang="ts">
const { t, locale } = useI18n()
const toast = useToast()
const gatewayOrigin = useRequestURL().origin

const onboardingSteps = computed(() => [
  {
    number: '01',
    title: t('public.home.onboardingSteps.registerTitle'),
    description: t('public.home.onboardingSteps.registerDescription')
  },
  {
    number: '02',
    title: t('public.home.onboardingSteps.keyTitle'),
    description: t('public.home.onboardingSteps.keyDescription')
  },
  {
    number: '03',
    title: t('public.home.onboardingSteps.callTitle'),
    description: t('public.home.onboardingSteps.callDescription')
  }
])

const curlSnippet = computed(() => [
  'curl "' + gatewayOrigin + '/v1/exchange-rate?currency=CNY&encoding=json" \\',
  '  -H "x-api-key: <your-api-key>"'
].join('\n'))

const responseSnippet = computed(() => locale.value.startsWith('zh')
  ? [
      '{',
      '  "code": "OK",',
      '  "message": "请求成功",',
      '  "data": {',
      '    "base": "CNY",',
      '    "rates": { "USD": 0.1392 }',
      '  }',
      '}'
    ].join('\n')
  : [
      '{',
      '  "code": "OK",',
      '  "message": "Request completed",',
      '  "data": {',
      '    "base": "CNY",',
      '    "rates": { "USD": 0.1392 }',
      '  }',
      '}'
    ].join('\n'))

async function copyCodeSnippet(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: t('common.feedback.copied'), color: 'success' })
  } catch {
    toast.add({ title: t('common.feedback.copyFailed'), color: 'error' })
  }
}
</script>

<template>
  <section
    id="api-onboarding"
    class="api-onboarding"
    aria-labelledby="api-onboarding-title"
  >
    <div class="api-onboarding__layout">
      <div class="api-onboarding__content">
        <span class="api-onboarding__kicker">{{ $t('public.home.onboardingKicker') }}</span>
        <h2 id="api-onboarding-title">
          {{ $t('public.home.onboardingTitle') }}
        </h2>
        <p class="api-onboarding__description">
          {{ $t('public.home.onboardingDescription') }}
        </p>

        <ol class="api-onboarding__steps">
          <li
            v-for="step in onboardingSteps"
            :key="step.number"
            class="api-onboarding-step"
          >
            <span class="api-onboarding-step__number">{{ step.number }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </div>

      <div class="api-onboarding__examples">
        <article class="api-onboarding-code">
          <header class="api-onboarding-code__header">
            <div class="api-onboarding-code__title">
              <span class="api-onboarding-code__signal" aria-hidden="true" />
              <span>{{ $t('public.home.curlExample') }}</span>
            </div>
            <UTooltip :text="$t('common.actions.copy')">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                square
                icon="i-lucide-copy"
                :aria-label="$t('common.actions.copy')"
                @click="copyCodeSnippet(curlSnippet)"
              />
            </UTooltip>
          </header>
          <pre><code>{{ curlSnippet }}</code></pre>
        </article>

        <article class="api-onboarding-code">
          <header class="api-onboarding-code__header">
            <div class="api-onboarding-code__title">
              <span class="api-onboarding-code__signal" aria-hidden="true" />
              <span>{{ $t('public.home.responseExample') }}</span>
            </div>
            <UTooltip :text="$t('common.actions.copy')">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                square
                icon="i-lucide-copy"
                :aria-label="$t('common.actions.copy')"
                @click="copyCodeSnippet(responseSnippet)"
              />
            </UTooltip>
          </header>
          <pre><code>{{ responseSnippet }}</code></pre>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.api-onboarding {
  border-block: 1px solid var(--ui-border);
  background: color-mix(in oklab, var(--ui-bg-elevated) 72%, var(--ui-bg-muted));
}

.api-onboarding__layout {
  display: grid;
  width: calc(100% - 2rem);
  max-width: 1180px;
  margin-inline: auto;
  gap: 3.5rem;
  padding-block: 4.5rem;
}

.api-onboarding__content {
  min-width: 0;
}

.api-onboarding__kicker {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--ui-secondary);
  font-family: var(--font-code);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.api-onboarding h2 {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  font-weight: 650;
  line-height: 1.2;
}

.api-onboarding__description {
  max-width: 35rem;
  margin: 0.75rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
}

.api-onboarding__steps {
  position: relative;
  display: grid;
  gap: 1.5rem;
  margin: 2rem 0 0;
  padding: 0;
  list-style: none;
}

.api-onboarding__steps::before {
  position: absolute;
  top: 1.1rem;
  bottom: 1.1rem;
  left: 1.05rem;
  width: 1px;
  background: color-mix(in oklab, var(--ui-secondary) 32%, var(--ui-border));
  content: "";
}

.api-onboarding-step {
  position: relative;
  display: grid;
  grid-template-columns: 2.15rem minmax(0, 1fr);
  gap: 1rem;
}

.api-onboarding-step__number {
  z-index: 1;
  display: grid;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border: 1px solid color-mix(in oklab, var(--ui-secondary) 26%, var(--ui-border));
  border-radius: 7px;
  color: var(--ui-secondary);
  background: var(--ui-bg-elevated);
  font-family: var(--font-code);
  font-size: 0.72rem;
  font-weight: 700;
}

.api-onboarding-step h3 {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-size: 0.925rem;
  font-weight: 650;
  line-height: 1.4;
}

.api-onboarding-step p {
  margin: 0.35rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  line-height: 1.65;
}

.api-onboarding__examples {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.api-onboarding-code {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-bg-elevated);
}

.api-onboarding-code__header {
  display: flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--ui-border);
  padding: 0.45rem 0.7rem 0.45rem 0.9rem;
}

.api-onboarding-code__title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ui-text-toned);
  font-size: 0.75rem;
  font-weight: 650;
}

.api-onboarding-code__signal {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--ui-secondary);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--ui-secondary) 12%, transparent);
}

.api-onboarding-code pre {
  min-height: 8.75rem;
  margin: 0;
  overflow: auto;
  padding: 1rem;
  color: var(--ui-text-toned);
  background: color-mix(in oklab, var(--ui-bg-muted) 74%, var(--ui-bg-elevated));
  font-size: 0.75rem;
  line-height: 1.7;
}

@media (width >= 960px) {
  .api-onboarding__layout {
    grid-template-columns: minmax(0, 0.9fr) minmax(420px, 1.1fr);
    align-items: center;
    gap: 5rem;
  }
}

@media (width < 640px) {
  .api-onboarding__layout {
    gap: 2.5rem;
    padding-block: 3.5rem;
  }

  .api-onboarding-code pre {
    font-size: 0.6875rem;
  }
}
</style>
