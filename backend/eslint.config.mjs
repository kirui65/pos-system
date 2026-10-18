import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [{ ignores: ['dist/**'] }, js.configs.recommended, { files: ['**/*.ts'], languageOptions: { parser, parserOptions: { project: './tsconfig.json' }, globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' } }, plugins: { '@typescript-eslint': tseslint }, rules: { ...tseslint.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'error' } }];
