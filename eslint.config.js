import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist/**', 'node_modules/**', 'receipts/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.serviceworker } }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];
