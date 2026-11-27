# CORE: what is fixed

Locked. Only the owner changes this file (with Claude, for high level decisions). Everything not written here is free
to change fast, including DESIGN.md and ARCHITECTURE.md, which describe the current state and must be kept true.
If another document disagrees with this one, this one wins.

## Product

EnkelLGH: every rental listing in central Stockholm on one map with real travel times. Free: travel time to
Karlaplan. Paid (one plan): your own pinned places. Links always go to the original ad; we show comparison facts only.

## Architecture

* The laptop worker is the only thing that talks to listing sites (polite fetching, own accounts, nothing else).
* Supabase is the backend: Postgres with RLS, Edge Functions, Storage. SQL migrations are the only schema source.
* The web app (`apps/web`) is static on Cloudflare (Workers, static assets) and reads Supabase with the publishable key. No secret key in the browser
*  `@lk/shared` is the single source for domain rules, formats and design tokens. Never duplicate them.
* Frame (`vendor/frame`) is the UI foundation. Never edit it from this repo; compose with its components.
* Stack: TypeScript, React, Vite, Leaflet. No new framework, state library or CSS framework without the owner.

## Design

* Brand: `EnkelLGH`, wordmark `Enkel` regular + `LGH` bold in the accent.
* Black and white with one accent, indigo. Font: Inter Tight. Light mode only. No animations beyond Leaflet's own.
* Colour jobs, never mixed: traffic light (green to red) = price per m² only; indigo = the app (brand, selection,
  new, actions, Karlaplan); black = warnings; grey = everything else (sources, tags, text).
* All values (hex, sizes, fonts) live in `@lk/shared` tokens and `apps/web/src/app/theme.ts`; components use tokens.
* Mobile first: one column, the page scrolls normally. Only the navbar is sticky; only the navbar and the map popup are glass (blur).

## UX rules that must always hold

1. Tapping a pin selects its listing: popup and card outlined. The page does not scroll.
2. Tapping a card selects the same listing; the map does not move. Tapping it again deselects.
3. One selection at a time. Close button, tap on empty map and Esc deselect.
4. A pin shows only price (fill) and size (radius); the selected pin gets an indigo ring.
5. Every restid comes from the nightly travel matrix (one method for every pin; nothing calls SL at runtime; no
   route lines). The "nya" count respects the other filters.
6. Every number has one format everywhere (from `@lk/shared` `fmt`). No en or em dashes in UI text.
7. Rounded corners are never clipped (selected and new cards follow the list's radius).

## Protected files

`CORE.md`, `ROADMAP.md`, `CLAUDE.md`, `.claude/`, `.githooks/`, `vendor/frame/`. A commit touching them is refused
unless the owner sets `ALLOW_PROTECTED=1`.
