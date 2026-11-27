# apartment-map

EnkelLGH: every Stockholm rental ad on one map, with travel times. Live at https://apartment-map-smoky.vercel.app/
How it is built: [ARCHITECTURE.md](ARCHITECTURE.md).

**Fixed rules: [CORE.md](CORE.md). Plan to v1: [ROADMAP.md](ROADMAP.md). Agents: [CLAUDE.md](CLAUDE.md).**

## Layout

```
packages/shared/      domain objects (Listing, places, travel time, sanity checks) + DESIGN.md formats
apps/web/             the page: Vite + React + react-leaflet on Supabase (DESIGN.md v3)
apps/worker/          laptop worker: HttpClient (timeouts, retries, politeness), one adapter class per site
supabase/migrations/  database schema and row level security
DESIGN.md             page spec · ARCHITECTURE.md system spec
```

```bash
npm install
npm run typecheck && npm run lint
npm run fetch                 # dry run from this machine: fetch + validate every site → apps/worker/out/<date>/
npm run fetch -- qasa homeq   # some sites only
npm test                      # source fixtures, pipeline day, paywall (local Supabase), page rules (Chromium: npx playwright install chromium)
npm run dev -w @lk/web        # the page on http://localhost:5173 (copy apps/web/.env.example to apps/web/.env.local first)
npm run worker                # the daily run: fetch, write to Supabase (needs .env, see .env.example)
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,mailpit,realtime,postgres-meta,supavisor
                              # local Supabase in Docker; applies supabase/migrations. Keys: npx supabase status -o env
npm run db:types              # regenerate packages/shared/src/database.types.ts after a migration
apps/worker/router/setup.sh   # once: Python venv with r5py + a user level JDK 21 for the travel time matrix
apps/worker/systemd/install.sh  # daily 06:30 timer on this laptop (systemd user unit)
```

The dry run writes nothing to a database; it shows per site how many ads were fetched, kept, skipped
and rejected, and saves the raw responses (used as test fixtures later).

The old pipeline (browser scripts, a scheduled Claude task, GitHub Actions and a GitHub Pages map) was retired on
27 nov 2026; it is in the git history before that date.
