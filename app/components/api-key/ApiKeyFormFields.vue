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

const expiryItems: Array<{ label: string, value: ExpiryPreset }> = [
  { label: '永不过期', value: 'never' },
  { label: '1 小时', value: '1h' },
  { label: '1 天', value: '1d' },
  { label: '1 个月', value: '1mo' },
  { label: '自定义', value: 'custom' }
]

const scopesModeItems = [
  { label: '全部接口', value: 'all' },
  { label: '指定接口', value: 'pick' }
]

const nameHelp = computed(() => {
  if (!props.hints) return undefined
  if (props.showCount) return '批量生成 > 1 个时，首个使用此名称，其余自动追加后缀'
  if (props.editing) return '仅展示用，不影响密钥字符串本身'
  return undefined
})

const ipHelp = computed(() => {
  if (props.ipLineErrors.length > 0) {
    return `第 ${props.ipLineErrors.map(e => e.index).join(', ')} 行格式错误`
  }
  return props.hints
    ? '每行一条 CIDR，例如 1.2.3.4/32 / 10.0.0.0/8；留空 = 不限'
    : '每行一条；留空 = 不限'
})
</script>

<template>
  <div :class="size === 'sm' ? 'space-y-3' : 'space-y-4'">
    <!-- 名称 + 生成数量 -->
    <div
      class="grid gap-3"
      :class="showCount ? 'grid-cols-3' : 'grid-cols-1'"
    >
      <UFormField
        label="名称"
        :class="showCount ? 'col-span-2' : ''"
        :help="nameHelp"
      >
        <UInput
          v-model="form.name"
          placeholder="例如：默认密钥 / 生产密钥"
          :maxlength="80"
          :size="size"
        />
      </UFormField>
      <UFormField
        v-if="showCount"
        label="生成数量"
        :help="hints ? '一次最多 5 个' : undefined"
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
    <UFormField label="过期时间">
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
        placeholder="选择过期时间"
      />
      <p
        v-if="hints"
        class="text-xs text-muted mt-1"
      >
        {{ editing
          ? '选择「永不过期」会清空过期时间；选择预设会从当前时间起算。'
          : '过期后密钥不会被删除或禁用，调用接口时会返回到期信息。' }}
      </p>
    </UFormField>

    <!-- 积分配额 -->
    <UFormField label="积分配额">
      <div class="flex items-center gap-3">
        <USwitch
          v-model="form.unlimitedQuota"
          label="无限配额"
        />
        <UInput
          v-if="!form.unlimitedQuota"
          v-model.number="form.totalQuota"
          type="number"
          :min="0"
          placeholder="累计可消耗积分上限"
          class="flex-1"
          :size="size"
        />
      </div>
      <p
        v-if="hints"
        class="text-xs text-muted mt-1"
      >
        {{ editing
          ? '修改上限不会重置已消耗积分；若新上限低于已消耗，密钥将立即停止可用直至再次提高。'
          : '该密钥累计消耗积分达到上限后将拒绝调用；资金仍从钱包扣除。' }}
      </p>
    </UFormField>

    <!-- 接口范围 -->
    <UFormField label="接口范围">
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
        placeholder="选择允许调用的接口"
        class="mt-2 w-full"
        :size="size"
      />
    </UFormField>

    <!-- IP 白名单 -->
    <UFormField
      label="IP 白名单（CIDR）"
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
