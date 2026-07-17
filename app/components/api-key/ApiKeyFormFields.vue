<script setup lang="ts">
import type { ApiKeyFormModel, ExpiryPreset } from '#shared/types/api'

/**
 * API Key 创建 / 编辑的字段集合（受控）。
 *
 * 双向绑定整个 ApiKeyFormModel（来自 useApiKeyForm 的 reactive form），
 * user 页面的两个 UModal 与 admin 弹窗的折叠表单共用此组件，消除两份雷同模板。
 * - showCount：仅创建时展示「生成数量」
 * - editing：切换过期 / 配额的说明文案
 * - hints：是否展示较详细的帮助文案（user 端 true，admin 端紧凑则 false）
 * - size：控件尺寸（admin 弹窗用 'sm'）
 */
const form = defineModel<ApiKeyFormModel>({ required: true })

const props = withDefaults(defineProps<{
  scopeSelectItems: Array<{ label: string, value: string }>
  ipLineErrors: Array<{ index: number, value: string }>
  error?: string | null
  showCount?: boolean
  editing?: boolean
  hints?: boolean
  size?: 'sm' | 'md'
}>(), {
  error: null,
  showCount: false,
  editing: false,
  hints: false,
  size: 'md'
})
const { t } = useI18n()

const expiryItems = computed<Array<{ label: string, value: ExpiryPreset }>>(() => [
  { label: t('common.apiKeys.expiry.never'), value: 'never' },
  { label: t('common.apiKeys.expiry.oneHour'), value: '1h' },
  { label: t('common.apiKeys.expiry.oneDay'), value: '1d' },
  { label: t('common.apiKeys.expiry.oneMonth'), value: '1mo' },
  { label: t('common.apiKeys.expiry.custom'), value: 'custom' }
])

const scopesModeItems = computed(() => [
  { label: t('common.apiKeys.scopes.all'), value: 'all' },
  { label: t('common.apiKeys.scopes.selected'), value: 'pick' }
])

const nameHelp = computed(() => {
  if (!props.hints) return undefined
  if (props.showCount) return t('common.apiKeys.form.batchNameHelp')
  if (props.editing) return t('common.apiKeys.form.editNameHelp')
  return undefined
})

const ipHelp = computed(() => {
  if (props.ipLineErrors.length > 0) {
    return t('common.apiKeys.form.invalidIpLines', { lines: props.ipLineErrors.map(e => e.index).join(', ') })
  }
  return props.hints
    ? t('common.apiKeys.form.ipHelpDetailed')
    : t('common.apiKeys.form.ipHelpCompact')
})

const expiryHelp = computed(() => props.editing
  ? t('common.apiKeys.form.expiryEditHelp')
  : t('common.apiKeys.form.expiryCreateHelp'))
const quotaHelp = computed(() => props.editing
  ? t('common.apiKeys.form.quotaEditHelp')
  : t('common.apiKeys.form.quotaCreateHelp'))
</script>

<template>
  <div :class="size === 'sm' ? 'space-y-3' : 'space-y-4'">
    <!-- 名称 + 生成数量 -->
    <div
      class="grid gap-3"
      :class="showCount ? 'grid-cols-3' : 'grid-cols-1'"
    >
      <UFormField
        :label="$t('common.apiKeys.form.name')"
        :class="showCount ? 'col-span-2' : ''"
        :help="nameHelp"
      >
        <UInput
          v-model="form.name"
          :placeholder="$t('common.apiKeys.form.namePlaceholder')"
          :maxlength="80"
          :size="size"
        />
      </UFormField>
      <UFormField
        v-if="showCount"
        :label="$t('common.apiKeys.form.count')"
        :help="hints ? $t('common.apiKeys.form.countHelp') : undefined"
      >
        <UInput
          v-model.number="form.count"
          type="number"
          :min="1"
          :max="5"
          :size="size"
        />
      </UFormField>
    </div>

    <!-- 过期时间 -->
    <UFormField :label="$t('common.apiKeys.form.expiry')">
      <URadioGroup
        v-model="form.expiryPreset"
        orientation="horizontal"
        :items="expiryItems"
      />
      <CommonDateTimePicker
        v-if="form.expiryPreset === 'custom'"
        v-model="form.expiresAtCustom"
        class="mt-2"
        :size="size"
        :placeholder="$t('common.apiKeys.form.selectExpiry')"
      />
      <p
        v-if="hints"
        class="text-xs text-muted mt-1"
      >
        {{ expiryHelp }}
      </p>
    </UFormField>

    <!-- 积分配额 -->
    <UFormField :label="$t('common.apiKeys.form.quota')">
      <div class="flex items-center gap-3">
        <USwitch
          v-model="form.unlimitedQuota"
          :label="$t('common.apiKeys.form.unlimitedQuota')"
        />
        <UInput
          v-if="!form.unlimitedQuota"
          v-model.number="form.totalQuota"
          type="number"
          :min="0"
          :placeholder="$t('common.apiKeys.form.quotaPlaceholder')"
          class="flex-1"
          :size="size"
        />
      </div>
      <p
        v-if="hints"
        class="text-xs text-muted mt-1"
      >
        {{ quotaHelp }}
      </p>
    </UFormField>

    <!-- 接口范围 -->
    <UFormField :label="$t('common.apiKeys.form.scopes')">
      <URadioGroup
        v-model="form.scopesMode"
        orientation="horizontal"
        :items="scopesModeItems"
      />
      <USelectMenu
        v-if="form.scopesMode === 'pick'"
        v-model="form.scopesSelected"
        :items="scopeSelectItems"
        multiple
        searchable
        value-key="value"
        :placeholder="$t('common.apiKeys.form.selectScopes')"
        class="mt-2 w-full"
        :size="size"
      />
    </UFormField>

    <!-- IP 白名单 -->
    <UFormField
      :label="$t('common.apiKeys.form.ipWhitelist')"
      :help="ipHelp"
      :error="ipLineErrors.length > 0"
    >
      <UTextarea
        v-model="form.ipWhitelistText"
        :rows="size === 'sm' ? 2 : 3"
        placeholder="1.2.3.4/32&#10;10.0.0.0/8"
        class="w-full sm:max-w-lg font-mono text-xs"
      />
    </UFormField>

    <UAlert
      v-if="error"
      :title="error"
      color="warning"
      variant="subtle"
      icon="i-mdi-alert-outline"
    />
  </div>
</template>
