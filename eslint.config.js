import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', '*.config.js', '*.config.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      security,
      'no-secrets': noSecrets,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...security.configs.recommended.rules,
      'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],
    },
  },
  // Tests may use non-null assertions and looser typing.
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**', '**/__mocks__/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'security/detect-object-injection': 'off',
    },
  },
  prettier,
);
