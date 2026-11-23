/**
 * What the page rules test (apps/web/test) looks at. Only a build made with `--mode test` publishes it as
 * `window.__lgh`; the production build exposes nothing.
 */
export const hooks: Record<string, unknown> = {};

declare global {
  interface Window { __lgh?: Record<string, unknown> }
}

if (import.meta.env.MODE === 'test') window.__lgh = hooks;
