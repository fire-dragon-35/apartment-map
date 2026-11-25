# apartment-map

Daily Stockholm apartment search → map at https://fire-dragon-35.github.io/apartment-map/

The repo is moving to the architecture in [ARCHITECTURE.md](ARCHITECTURE.md). Until each step is done, the
**legacy pipeline** below keeps running unchanged.

**Plan to v1: [ROADMAP.md](ROADMAP.md).**

## New layout (in progress)

```
packages/shared/      domain objects (Listing, places, travel time, sanity checks) + DESIGN.md formats
apps/web/             the page: Vite + React + react-leaflet on Supabase (DESIGN.md v3)
apps/worker/          laptop worker: HttpClient (timeouts, retries, politeness), one adapter class per site
supabase/migrations/  database schema and row level security
legacy/               the old pipeline, still running
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

## Legacy pipeline (still running)

Everything of the old pipeline lives in [`legacy/`](legacy/README.md) (how a run works is described there).
Only its three GitHub workflows stay in `.github/workflows/`, where GitHub requires them; they run inside `legacy/`.

| piece | retired by (ARCHITECTURE.md §16) |
|---|---|
| `legacy/scripts/*.js` + `legacy/build.py` + scheduled Claude task | step 2 (worker writes to Supabase) |
| `.github/workflows/facebook.yml`, Claude reading posts | step 3 |
| `.github/workflows/routes.yml`, `fb-eta.yml`, `legacy/scripts/routes.py`, `legacy/scripts/fb_eta.py` | step 4 |
| `legacy/index.html` + its JSON data, root `index.html` redirect, GitHub Pages | step 5 |
