import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'playwright-report/**']
  },
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];

