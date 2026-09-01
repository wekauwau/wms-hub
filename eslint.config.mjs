import eslint from '@eslint/js'
import { createConfigForNuxt } from '@nuxt/eslint-config'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default createConfigForNuxt()
  .prepend(eslint.configs.recommended, {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**',
      '**/graphify-out/**',
    ],
  })
  .append(
    ...tseslint.configs.recommended,
    {
      files: ['packages/api/**/*.ts'],
      languageOptions: {
        globals: globals.node,
      },
    },
    {
      files: ['packages/web/**/*.vue'],
      languageOptions: {
        parser: vueParser,
      },
    },
    prettier,
  )
