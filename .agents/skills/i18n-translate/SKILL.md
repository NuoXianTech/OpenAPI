---
name: i18n-translate
description: Maintain this Nuxt 4 project's @nuxtjs/i18n messages in the nested en-US and zh-CN JSON locale files. Use whenever adding or changing user-facing UI copy, t()/$t()/useI18n() keys, placeholders, validation text, toasts, dialogs, labels, accessibility text, page metadata, locale switching, or when auditing missing, mismatched, duplicated, or untranslated messages under i18n/locales.
---

# Nuxt i18n Translation Workflow

## Project contract

- Use `@nuxtjs/i18n` with Vue I18n message syntax.
- Treat `shared/config/locale-defaults.ts` and the `i18n` section of `nuxt.config.ts` as the source of truth for supported locales and registered files.
- Maintain exactly the currently supported locales unless the user explicitly requests another locale:
  - `zh-CN`: default locale and Simplified Chinese UI.
  - `en-US`: English UI.
- Store messages as nested JSON objects under `i18n/locales/<locale>/`; resolve them with dotted keys such as `auth.login.title` or `admin.system.site.basic.title`.
- Keep the two locale trees structurally identical: same files, nested key paths, value types, and interpolation variables.

The registered files for each locale are:

```text
common.json
auth.json
public.json
user.json
admin/core.json
admin/logs.json
admin/credits.json
admin/users.json
admin/content.json
admin/apis.json
admin/system.json
```

Do not use assumptions from unrelated projects. This repository has no `web/` locale root, no flat `"translation"` object, no seven-locale requirement, and no `bun run i18n:sync` command.

## Preflight

1. Inspect the call site and determine whether the text is visible to users. Translate UI labels, buttons, placeholders, validation feedback, toasts, dialogs, empty states, tooltips, ARIA labels, and page titles. Do not translate comments, logs, API paths, enum values, database fields, or developer-only identifiers.
2. Locate the existing dotted key or the closest related message group in both locales.
3. Choose the domain file that owns the UI:
   - Shared actions, states, filters, notifications, and reusable components: `common.json`.
   - Login, registration, OAuth, email verification, and password recovery: `auth.json`.
   - Public home, API catalog, statistics, announcements, and friend links: `public.json`.
   - User workspace, API keys, credits, logs, and account settings: `user.json`.
   - Admin pages: use the matching file under `admin/`; reserve `admin/core.json` for shared dashboard shell copy.
4. Check nearby keys and the rendered component context before choosing wording. Do not copy issue text or conversation wording directly into locale values when it is not suitable UI copy.

## Editing messages

- Add or change the same nested key in `en-US` and `zh-CN` in one task.
- Use `apply_patch` for focused JSON edits. There is no project script that must mediate locale writes.
- Preserve the surrounding semantic order and formatting. Do not alphabetically sort or stringify an entire file; current files intentionally group related messages and sometimes keep small objects on one line.
- Keep JSON at two-space indentation and avoid unrelated formatting churn.
- Reuse an existing shared key only when its meaning and tone match exactly. Do not force unrelated screens to share vague copy merely to reduce key count.
- Use concise camelCase path segments. Keep keys semantic, for example `auth.register.emailPlaceholder`, rather than embedding the displayed sentence in the key.
- Do not create a new locale file unless the domain genuinely needs one. If a file is added, add the matching file for both locales and register both paths in `nuxt.config.ts`.

## Code usage

Use Vue I18n directly:

```vue
<script setup lang="ts">
const { t, locale } = useI18n()

const title = computed(() => t('user.settings.profile.title'))
</script>

<template>
  <UButton :aria-label="$t('common.actions.save')">
    {{ $t('common.actions.save') }}
  </UButton>
</template>
```

- Use `t()` in `<script setup>` and composables; use `$t()` or a script `t()` binding in templates.
- Keep page metadata reactive when appropriate, for example `useHead({ title: () => t('public.stats.title') })`.
- Pass the active locale to `Intl`, date, and number helpers when formatting locale-sensitive values.
- Keep dynamic keys constrained to a known set, typed metadata map, or validated enum. Verify every possible resolved key manually because static searches cannot prove template-literal coverage.
- Use `te(key)` plus a safe fallback for genuinely open-ended server values. Never concatenate untrusted input into a translation key and assume it exists.
- Do not use `localePath` or add URL prefixes for ordinary navigation; the configured strategy is `no_prefix`.

## Translation rules

- Write natural American English for `en-US` and natural Simplified Chinese for `zh-CN`.
- Preserve product names, provider names, URLs, email examples, API paths, HTTP methods, CIDR values, JSON field names, and code-like identifiers unless the surrounding explanatory text needs translation.
- Prefer compact wording for buttons, tabs, table headers, badges, mobile layouts, and sidebar items.
- Keep terminology consistent with nearby messages. In particular, distinguish API keys, credits, calls, users, administrators, status, and availability consistently.
- Treat database-managed content such as announcements, API names, and site settings as user data rather than static locale copy.
- Localize client-facing fallbacks for server failures, but do not replace stable server error codes or protocol fields with translated strings unless explicitly requested.

## Interpolation and Vue I18n syntax

- Preserve the exact variable set in both locales: `{count}`, `{name}`, `{email}`, `{time}`, and similar placeholders may move within the sentence but must not be renamed, added, or dropped.
- Preserve Vue I18n literal escapes such as `{'@'}` in email examples. A raw `@` inside a linked-message-sensitive value may be parsed differently.
- Keep punctuation outside placeholders unless it is part of the rendered value.
- Check the longest realistic rendered value in both supported languages when copy appears in compact controls or mobile layouts.

## Auditing

For a small change:

1. Search the exact dotted key in the call site and both locale trees.
2. Parse both changed JSON files.
3. Confirm the English and Chinese values have identical placeholder sets.
4. Inspect the diff for unrelated reformatting.

For a broader audit, use a temporary read-only script or equivalent shell checks to:

- Recursively flatten every JSON file in `en-US` and `zh-CN` to dotted leaf paths.
- Report missing or extra files and keys in either locale.
- Report duplicate dotted keys across files; multiple registered locale files are merged and duplicate keys can overwrite each other.
- Report object/string/number/boolean type mismatches.
- Compare `{variable}` placeholder sets for every paired string.
- Scan `app/**/*.vue` and `app/**/*.ts` for static `t('...')` and `$t('...')` calls that do not resolve to a locale key.
- Review template-literal and metadata-driven keys separately.
- Search newly changed Vue code for hard-coded user-facing strings while ignoring comments and developer diagnostics.

Delete temporary audit scripts after use unless the user explicitly asks to keep a reusable project tool.

## Validation

Run checks proportional to the change:

```bash
git diff --check
pnpm lint
pnpm typecheck
```

- At minimum, parse every changed locale JSON file even when no application code changed.
- Run targeted tests when translated copy affects validation branches or interaction behavior.
- Do not run `pnpm build` solely for an i18n text change unless the user asks for it or the task is part of release validation.

## Completion checklist

- Update both `en-US` and `zh-CN` at the same dotted path.
- Place the key in the correct domain file and avoid duplicate full paths.
- Preserve interpolation variables and Vue I18n literal syntax.
- Confirm every static and dynamic call site resolves.
- Keep user-facing copy natural, compact, and consistent with the surrounding UI.
- Validate JSON syntax, locale parity, lint, type checking, and the final diff as appropriate.
