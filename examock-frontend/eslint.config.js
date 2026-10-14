import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // react-hooks v7's `recommended` turns on the React-Compiler-era rule that
      // flags setState() called synchronously inside an effect. The sites it hits
      // here are the documented "reset / derive state" patterns in untested admin
      // flows (adminDashboard selection sync, form-to-prop sync). Keep them visible
      // as warnings rather than blocking the gate. (audit F13)
      "react-hooks/set-state-in-effect": "warn",
    },
  },
])
