# Instructions for coding agents

1. Read `CORE.md` first. It is fixed; follow it. Never edit the protected files it lists (the commit hook refuses them).
2. Work fast and small: one change, check it in the running app (`npm run dev -w @lk/web`), move on. Do not run the
   full test suite after every edit.
3. Before committing run `npm run check` (typecheck, lint, page tests). The pre-push hook runs it too.
4. UI: compose with Frame (`vendor/frame/AGENTS.md`, table "Which component for what"). Colours, sizes and fonts only
   from tokens (`@lk/shared`, `apps/web/src/app/theme.ts`).
5. If you change behaviour or design that DESIGN.md or ARCHITECTURE.md describe, update that document in the same
   commit so it stays true. If a change would break CORE.md, stop and ask the owner.
6. No new dependencies, documents or tests unless asked. Delete code you replace.
7. Report in a few lines: what changed, what you checked, anything you were unsure of.
