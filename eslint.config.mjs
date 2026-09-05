// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import tseslint from 'typescript-eslint'

export default withNuxt(
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      // TypeScript `defineProps` declarations may intentionally leave optional
      // props undefined; runtime defaults are not required for those props.
      'vue/require-default-prop': 'off'
    }
  },
  {
    files: ['server/**/*.ts', 'shared/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': ['error', {
        checkThenables: true,
        ignoreVoid: true
      }],
      '@typescript-eslint/no-misused-promises': 'error'
    }
  }
)
