import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'legacy/**', 'index.html', 'vendor/**', 'apps/worker/out/**', 'apps/worker/cache/**', 'apps/web/dist-test/**', 'apps/worker/router/.venv/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // apps/web follows Frame's rules (vendor/frame/AGENTS.md): accessibility, hooks, no inline styles
  {
    files: ['apps/web/src/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
    plugins: { ...jsxA11y.flatConfigs.recommended.plugins, 'react-hooks': reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-restricted-syntax': ['error', {
        selector: "JSXAttribute[name.name='style']",
        message: 'No inline styles (DESIGN.md §12). Use a CSS Module; a data colour goes through app/Tones.tsx.',
      }, {
        selector: "JSXOpeningElement[name.name=/^h[1-6]$/]",
        message: 'Headings are Frame `Heading` (level display|1|2|3), never a raw <h1>-<h6> (DESIGN.md §12).',
      }, {
        selector: "JSXOpeningElement[name.name!='Heading'] > JSXAttribute[name.name='as'][value.value=/^h[1-6]$/]",
        message: 'Use Frame `Heading` for headings, not `as="h…"` on Text or Stack (DESIGN.md §12).',
      }],
    },
  },
);
