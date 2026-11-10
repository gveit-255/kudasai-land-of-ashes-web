import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  {
    ignores: [
      'dist/**',
      'public/demo/**',
      '.astro/**',
      '.wrangler/**',
      'qa/**',
      'tools/**',
      'archive/**',
      'ABRIR-WEB.html',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['**/*.astro'], languageOptions: { parserOptions: { parser: ts.parser } } },
];
