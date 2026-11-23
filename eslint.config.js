import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'legacy/**', 'index.html', 'apps/worker/out/**', 'apps/worker/cache/**', 'apps/web/dist-test/**', 'apps/worker/router/.venv/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
