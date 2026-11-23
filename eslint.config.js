import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'legacy/**', 'scripts/**', 'index.html', 'apps/worker/out/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
