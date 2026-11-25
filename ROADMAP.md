# Roadmap to v1

The path from today to a paid v1, in order. One step per agent session; each ends with typecheck, lint and tests
green and this file updated. Nothing visual is decided in prompts: DESIGN.md is the only place for it.

| # | Step | Done when | Status |
|---|---|---|---|
| 1 | **Design system** (DESIGN.md 4.0): EnkelLGH, black and white, indigo accent, traffic light price, neutral sources, black warning, Inter Tight | tokens in `@lk/shared`, DESIGN.md §3, font self hosted, page rules test reads its colours from `@lk/shared` | ✅ 25 nov |
| 2 | **Cleanup** | see below | ⬜ |
| 3 | **Auth and payment** | see below | 🟡 code done (Frame `@frame/supabase`); deploy and Stripe setup left |
| 4 | **Landing page** | see below | ⬜ |
| 5 | **Launch** | see below | ⬜ |

## 2. Cleanup (one session)

* Wordmark per DESIGN.md §3 (`Enkel` + `LGH` in accent) in the navbar.
* R13: selected and new cards follow the list's rounded corners; add the R13 check to test 3.
* Remove every animation and transition except Leaflet's own; no `@keyframes`.
* Every colour, size and space in app CSS comes from a token; no hex in `apps/web/src` outside `app/theme.ts`.
* Data colours through Frame's `Badge tone="custom"` only; fix the two inline style lint errors in `Details.tsx`.
* Move the custom range slider into Frame (`Slider` with two thumbs) or delete it; one slider implementation.
* Budgets, checked in the report: app CSS under 400 lines, JS under 150 KB gzip, lint with 0 errors.

## 3. Auth and payment (one or two sessions)

Built into Frame (`@frame/supabase`, see `vendor/frame/docs/backend/auth-billing.md`); the app has `#/logga-in` with
magic link, paywall, checkout and portal. Left, on the laptop: `supabase db push --include-all`, deploy the three
`frame-*` functions, set the four Supabase secrets, create the Stripe price, webhook and portal, add the site URL
to Supabase Auth. After a Frame update: `npx frame-supabase sync .`.

* Supabase magic link only (no passwords, no social logins).
* One plan, Stripe Checkout + one webhook Edge Function (idempotent, test 5). Price: decide before building (pricing notes: 149 to 199 kr per month, competitors 79 to 349).
* Paid feature: custom pins with matrix travel times (phase 1.5 is ready). Free: Karlaplan.
* No account settings page beyond "cancel" (Stripe customer portal link).

## 4. Landing page (one session)

* One screen: headline, a map image, the price, one button. Same design system, no animations.

## 5. Launch

* Facebook through the worker (step 3 of ARCHITECTURE.md §16) if not done; retire the legacy pipeline after a week of parallel runs.
* Domain, Vercel production env, Stripe live keys.

## After any design change

1. Change DESIGN.md first (version and changelog line at the top).
2. Change the tokens in `@lk/shared` (`format/index.ts`, `format/design.ts`); never hex in components.
3. Run `npm test -w @lk/web` (test 3 reads its colours from `@lk/shared`) and fix until ALL PASS.
4. Look at the page on a phone before pushing.
