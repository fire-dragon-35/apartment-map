# ARCHITECTURE.md · Lägenhetskartan

Status: draft 2, 23 nov 2026. Replaces the current mix (laptop browser + GitHub Actions + scheduled Claude task + JSON files in the repo).

`DESIGN.md` stays the spec for how the page looks and behaves. This file is the spec for everything behind it.

---

## 1. Goal

A web app that shows every rental apartment in Stockholm that matches a user's filters, with real public transport travel time to a place the user picks, and links to the original ad.

* **Free:** listings, filters, travel time to Karlaplan (the default pin), map and list.
* **Paid (Stripe):** your own pins, several pins, saved searches, alerts.

## 2. Principles

1. **One source of truth.** All data lives in Supabase. Nothing important lives on the laptop or in the repo.
2. **The laptop only fetches.** It is the only thing that talks to listing sites, and it keeps no state. If it breaks, install the worker on another computer.
3. **Deterministic pipeline.** Same raw input gives the same rows. Raw responses are stored so any day can be replayed.
4. **Check data at the door.** Every adapter output is validated against one schema (zod) before it touches the database.
5. **Measured coverage.** Every run records how many ads each source returned. A drop raises an alert; silence never means "nothing new".
6. **Show little, link always.** Store and show only the facts needed to compare. No ad text, no photos. Every listing links to the original ad (section 11).
7. **One language.** TypeScript in the worker, the edge functions and the frontend, sharing types and formats.

## 3. Overview

```
 laptop (worker, scheduled)                 Supabase (cloud)                         browser
 ───────────────────────────               ───────────────────────────              ─────────────────
 fetch Qasa, HomeQ, Bostadsf., ──raw──▶   Storage: raw/{source}/{date}-{sha8}.json.gz
 Samtrygg, Apify(Facebook)                  │
 parse + validate (shared/zod) ──rows──▶   Postgres: listings, source_runs, …  ◀──read (RLS)── React app
                                            │                                    ──pins──▶   (Vercel)
                                            Edge Functions:                       ◀─times──
                                             travel-times  ──▶ SL planner / OTP
                                             extract-fb    ──▶ Claude API
                                             stripe-webhook ◀── Stripe
                                            Auth (email link, Google)
```

## 4. Components

| Component | Runs on | Does | Talks to |
| --- | --- | --- | --- |
| **Worker** | laptop (systemd user timer on Linux; launchd / Task Scheduler elsewhere; 06:30 daily + on wake if missed) | fetch every source fully, store raw, parse, validate, upsert, mark removed, record run | listing sites, Apify, Supabase (service key) |
| **Database** | Supabase Postgres | all rows, row level security, `pg_cron` for housekeeping | |
| **Storage** | Supabase Storage | raw responses (gzip), kept 30 days | |
| **travel-times** | Supabase Edge Function | travel time + route from a pin to many places, cached | SL journey planner (phase 1), OpenTripPlanner (phase 2) |
| **extract-fb** | Supabase Edge Function, triggered on new `fb_posts` | turn a free text post into listing fields with a fixed schema | Claude API |
| **stripe-webhook** | Supabase Edge Function | keep `subscriptions` in step with Stripe | Stripe |
| **notify** | Supabase Edge Function, after each run | email paying users their new matches | Resend (or Supabase SMTP) |
| **Web app** | Vercel (static build) | map, list, filters, pins, login, checkout | Supabase (anon key + user session) |

The worker does the parsing on the laptop so a broken site is fixed in one place (its adapter) and the database only ever receives valid rows.

## 5. Data model

The SQL below is the design; `supabase/migrations/` is the source of truth and also holds the `active_listings` view, the helper functions `is_karlaplan` / `is_paying`, `listings.content_hash`, `source_runs.skipped/invalid` and `subscriptions.last_event_id`. The private Storage bucket `raw` is created by its own migration.

```sql
-- runs and coverage
create table runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean
);
create table source_runs (
  run_id bigint references runs on delete cascade,
  source text not null,              -- 'qasa' | 'homeq' | 'bostadsformedlingen' | 'samtrygg' | 'facebook'
  complete boolean not null,         -- every page fetched without error
  fetched int not null, kept int not null,
  error text, duration_ms int,
  raw_path text,                     -- Storage key of the raw response; null once retention deleted the file
  raw_sha256 text,                   -- sha256 of the gzipped body; an identical response is not uploaded again
  primary key (run_id, source)
);

-- places: one row per location (4 decimals ≈ 10 m), shared by duplicates and travel times
create table places (
  id bigint generated always as identity primary key,
  lat numeric(7,4) not null, lon numeric(7,4) not null,
  exact boolean not null default true,   -- false = area centre (Facebook)
  unique (lat, lon)
);

-- listings: one row per ad on one site
create table listings (
  id bigint generated always as identity primary key,
  source text not null, source_id text not null,
  url text not null,
  place_id bigint references places,
  street text, area text,
  rent int, m2 numeric, rooms numeric,
  kpm int generated always as (case when m2 > 0 then round(rent / m2) end) stored,
  start_date date, end_date date,      -- null start = unknown; 'now' stored as first_seen date
  first_hand boolean, student boolean, furnished boolean,
  notes text[] not null default '{}',
  flags text[] not null default '{}',  -- e.g. 'below_market'
  first_seen date not null,            -- set once, never changed
  last_seen date not null,
  removed_at date,                     -- set when a complete run no longer returns it
  same_as bigint references listings,  -- copy of the same flat on another site
  unique (source, source_id)
);

create table listing_changes (
  listing_id bigint references listings on delete cascade,
  seen_at date not null, field text not null, old text, new text
);

-- Facebook: raw post and its extraction
create table fb_posts (
  post_id text primary key,
  group_name text, posted_at timestamptz, url text not null, text text not null,
  is_offer boolean,                    -- null until extracted
  extracted jsonb,                     -- validated listing fields
  extractor_version int,
  listing_id bigint references listings
);

-- travel time cache: place → destination cell
create table travel_times (
  place_id bigint references places,
  dest_lat numeric(6,3), dest_lon numeric(6,3),   -- destination rounded to ~100 m
  profile text not null default 'weekday_0800',
  walk_min int, transit_min int, minutes int not null,  -- minutes = min(walk, transit)
  legs jsonb,                                            -- [mode, line, coords, minutes, stops]
  computed_at timestamptz not null default now(),
  primary key (place_id, dest_lat, dest_lon, profile)
);

-- users
create table profiles (id uuid primary key references auth.users, created_at timestamptz default now());
create table destinations (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  label text, lat numeric(7,4), lon numeric(7,4), arrive_by time default '08:00'
);
create table saved_searches (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  destination_id bigint references destinations,
  max_minutes int, max_rent int, min_m2 int, min_months int, alerts boolean default false
);
create table subscriptions (
  user_id uuid primary key references auth.users,
  stripe_customer text, stripe_subscription text,
  status text, current_period_end timestamptz
);
```

**Row level security**

| Table | Anonymous | Signed in | Paying | Worker / functions |
| --- | --- | --- | --- | --- |
| listings, places | read active rows | read | read | write (service key) |
| travel_times | read Karlaplan rows | read Karlaplan rows | read all | write |
| destinations, saved_searches | none | own rows, Karlaplan only | own rows | read |
| subscriptions | none | own row (read) | own row (read) | write (stripe-webhook) |
| runs, source_runs, fb_posts | none | none | none | read / write |

The paywall is enforced in the database (policy on `travel_times` and `destinations`), not only in the page.

## 6. Pipeline (one worker run)

1. `runs` row opened.
2. For each source, in parallel, through its adapter (section 7):
   1. fetch every page; save the raw response to Storage as `{source}/{date}-{sha8}.json.gz`, unless its sha256 equals that of the source's latest stored file, in which case `raw_path` points at that file (so every source run has a file to replay);
   2. parse and validate each item with the shared zod schema; invalid items are counted, logged and skipped;
   3. upsert into `places` and `listings` on `(source, source_id)`: new → `first_seen = today`; existing → update fields, `last_seen = today`, write `listing_changes`;
   4. if the fetch was **complete**, set `removed_at = today` on this source's active listings not seen today. An incomplete fetch never removes anything.
   5. write `source_runs`.
3. Duplicates: link listings of different sources with the same place (±50 m), m² (±2) and rent (±5 %) through `same_as`; the cheapest one is shown.
4. Facebook: new posts are inserted into `fb_posts`; `extract-fb` fills `extracted` and creates or updates a listing.
5. Travel times from every active place without a fresh Karlaplan row are computed (the free default) with the shared `TravelTimeService` (§8); the run log shows computed, reused and failed. A failure here never fails the run.
6. `runs.ok` set; `notify` runs.
7. **Coverage check:** if a source is incomplete, returns 0, or returns less than half of the median of its last 7 complete runs (checked once 3 exist), the run is marked not ok and `npm run worker` exits non-zero. The email comes with `notify` (step 6); until then the failed systemd unit is the alert.
8. **Raw retention:** files older than 30 days are deleted through the Storage API, except those a source run from the last 30 days still points at; source runs whose file was deleted get `raw_path = null`. A failure is logged and never fails the run.

Re-running a day replays the stored raw files through steps 2 to 5 and gives the same rows (`SourceAdapter.parse()` takes stored raw pages, no network).

## 7. Source adapters

One file per source in `apps/worker/src/sources/`, all with the same shape:

```ts
interface Adapter {
  source: Source;                                  // 'qasa' | …
  fetchAll(ctx: FetchCtx): AsyncIterable<RawPage>; // pages until the source says there are no more
  parse(page: RawPage): unknown[];                 // site JSON → loose objects
  toListing(item: unknown): ListingInput;          // → validated by ListingInput (zod)
}
```

| Source | Endpoint (known today) | Notes |
| --- | --- | --- |
| Qasa | `api.qasa.se/graphql` `homeIndexSearch`, areas Stockholm, Solna, Sundbyberg, Lidingö, Nacka, 100 per page | skip shared and senior homes |
| HomeQ | `api.homeq.se/api/v3/search`, municipalities 180 to 186 | individual ads only |
| Bostadsförmedlingen | `bostad.stockholm.se/AllaAnnonser/` | queue ads; show without queue data |
| Samtrygg | `samtrygg.se/RentalObject/SearchResult` | |
| Facebook | Apify actor on the public groups list | text goes to `extract-fb` |

Fetching is polite: one request at a time per site, a short pause between pages, a normal browser user agent. The search area is wide (all of Stockholm county's central municipalities); per user filters are applied on read, not at fetch.

## 8. Travel times to any pin

`travel-times` takes a destination and a list of place ids, returns minutes and legs, and fills the cache.

* **Phase 1 (launch):** one `TravelTimeService` in `packages/shared/src/travel/`, imported by the worker (Node) and by the `travel-times` edge function (Deno); no copies (the function's `deno.json` maps `@supabase/supabase-js`, the only bare import). Per place: the SL journey planner (`journeyplanner.integration.sl.se/v2/trips`, keyless), coordinate to coordinate, `calc_number_of_trips=3`, arriving at the profile's time (`weekday_0800` = 08:00) on the next weekday in Stockholm, fastest trip taken. Requests have a 15 s timeout, 2 retries with backoff and jitter, at most 6 in flight; a place whose request fails is skipped, counted in `failed` and not cached, so the next call retries it. An answer with no trip is asked once more, then `transit_min` is null.
  * **Result per place:** `walk_min` as DESIGN.md §6, `transit_min` from SL, `minutes = min(walk, transit)`, `legs` = `[mode, line, coords, minutes, stops]` (mode `walk|metro|train|tram|bus|boat|other`, at most 60 points per leg rounded to 5 decimals, consecutive walking legs merged) or null when walking wins.
  * **Cache:** `travel_times`, keyed by place × destination cell (rounded to 3 decimals, about 100 m) × profile; a row younger than 7 days is reused. Everything is computed for the cell centre, so a cached row is right for every pin in the cell.
  * **`travel-times` function:** `POST { lat, lon, placeIds }` (at most 300 ids) returns `{ results: [{ placeId, minutes, walkMin, transitMin, legs }], failed: [placeId] }`: cached rows at once, only the missing ones computed. Karlaplan's cell is open to everyone; any other destination needs a signed-in user with `is_paying`, else **402** with a Swedish message. Reads run as the caller (row level security applies), writes use the service role. The gateway does not check the JWT (`verify_jwt = false`, because anonymous visitors use the Karlaplan cell and publishable keys are not JWTs); the function does its own check. The request logic is `handleTravelTimes` in `packages/shared/src/travel/handler.ts`, so test 4 runs it on Node.
* **Phase 2 (when needed):** OpenTripPlanner with Trafiklab's open GTFS data for Stockholm and OpenStreetMap streets, on a small server. One request answers a pin to all places in about a second, with real walking times. Same function signature, so the page does not change.

Karlaplan times are computed by the worker for every new place and are free; other pins require a paying user.

## 9. Web app

* **Stack:** Vite + React + TypeScript, Leaflet (react-leaflet), TanStack Query, supabase-js. Hosted on Vercel.
* **Behaviour and look:** as `DESIGN.md` (v3): one scrolling page, map on top, list below, Leaflet popups, `Visa resväg`.
* **New screens:** sign in (Supabase Auth), pin editor (drag a pin, name it; paid), saved searches and alerts (paid), account with Stripe Customer Portal link.
* **Data loading:** one query for active listings with their Karlaplan time (small enough to load whole); for another pin, a call to `travel-times` with the ids of listings passing the other filters.

## 10. Payments

Stripe Checkout for a monthly subscription, Stripe Customer Portal for cancel and card changes. `stripe-webhook` verifies the signature and upserts `subscriptions`. A user is paying when `status in ('active','trialing') and current_period_end > now()`. Prices and trial live in Stripe, not in code.

## 11. Data guardrails

Based on the EU court's reading of the database right (*CV-Online Latvia v Melons*, C-762/19: a search tool that indexes and links to the original ads is fine as long as it does not harm the site's investment):

* store and show only comparison facts (position, rent, m², rooms, dates, source); no ad text, no photos, no contact details;
* every listing links to the original ad, which is where the user acts;
* fetch politely (section 7) and never log in to a site on a user's behalf;
* a source that asks to be removed is removed;
* the paid product is the tool (pins, travel times, alerts), not access to the listings;
* have a lawyer review this list before Stripe goes live.

## 12. Efficiency, speed, maintenance, robustness

**Do each piece of work once**
* Listings carry a content hash; a row is written only when the hash changes. A raw response whose sha256 equals the source's latest stored one is not uploaded again; the new source run points at the existing file.
* Travel times are cached per place × destination cell (~100 m) × profile and kept until the timetable data changes (weekly). Duplicates share a place, so one calculation serves all copies. Karlaplan is precomputed.
* A Facebook post is extracted once per `extractor_version`.
* The page loads one compact payload of active listings (~50 KB gzip, CDN cached). Travel times for another pin are requested only for listings that pass the other filters.

**Fast**
* The last payload is kept on the device (TanStack Query persisted to IndexedDB): map and list render at once, then refresh in the background.
* Small first load (React + Leaflet); paid screens are split out and loaded on demand.
* Canvas pins; the list renders only visible rows once it passes a few hundred.
* `active_listings` view with indexes on the filter columns, refreshed after each run.
* Travel times for a new pin fill in progressively.

**Maintainable**

```
worker/sources/   one class per site on a shared base class (paging, retry, raw save)
shared/domain/    pure objects, no I/O: Listing, Place, Money, TravelTime, Filters
shared/format/    the DESIGN.md formats, used by worker and web
worker/store/     repositories; the only code that touches SQL
worker/services/  Pipeline, TravelTimeService, Notifier
web/              React components on top of domain + format
```

* One source of truth for shapes: SQL migrations → generated types → zod at the door.
* HTTP client, clock and database are passed in, so the pipeline runs on fixtures without the network.
* Strict TypeScript and lint on every commit.

**Robust**
* Every request has a timeout and retries with backoff and jitter; a source that keeps failing is skipped for that run.
* Sources are independent. An incomplete fetch never removes listings; the last good data stays and the page shows when it was updated.
* Missing fields become null and show as `?`. Only items without id, link or position are dropped, and the drop is counted.
* Sanity checks: position inside the Stockholm area, rent and kr/m² in plausible ranges; outliers are flagged, not dropped.
* Runs are idempotent (upserts), locked against double starts, started on wake when missed, and a missing heartbeat for 36 hours sends a push (§14).
* Outside services down: SL → keep cached times or show `restid saknas`; Claude → posts stay queued and are retried; Stripe → retries its webhooks, each event id is handled once.
* The web app isolates failures per part (error boundaries) and says plainly when data cannot load.

## 13. Tests (only the must haves)

No unit tests per function. Five checks, each guarding something that would fail silently otherwise:

| Test | Guards against |
| --- | --- |
| **Source fixtures:** each adapter parses a saved real response into valid listings with the expected count | a site changing its format and the data quietly shrinking |
| **Pipeline day:** a fake two day run on fixtures gives the right new, changed, removed and duplicate rows, and an incomplete source removes nothing | wrong "new" counts, ads vanishing, double listings |
| **Page rules:** `tests/design_check.py` (ported to the React app) checks the ✓ rules in DESIGN.md | interaction and format regressions |
| **Paywall:** an anonymous and a free user cannot read other pins' travel times or other users' rows, and get 402 from `travel-times` for a custom pin; a paying user gets results. Runs against local Supabase (`npx supabase start`) and is skipped, visibly, without it | data or paid features leaking |
| **Stripe webhook:** the same event twice gives one subscription row in the right state | double or lost subscriptions |

Plus the type checker and linter. Everything else is covered by the coverage alerts in section 6.

## 14. Operations

* **Secrets:** `.env` on the laptop (Supabase service key, Apify token); Supabase function secrets (Claude, Stripe, SMTP). Never in the repo.
* **Monitoring:** `source_runs` per source and day. The alert runs in Supabase, so it still works when the laptop is dead: a `pg_cron` job calls `worker_health_check()` every morning at 09:00 Stockholm time (the job fires at 07:00 and 08:00 UTC and the function acts only at 09:00 local, so daylight saving needs no change). It sends **one push through ntfy.sh** (`pg_net`) when no run finished ok in the last 36 hours, when the last run was not ok (a run unfinished after 3 hours counts as not ok), or when a source of the last run was incomplete, returned 0 ads or under half of the median of its 7 earlier complete runs. The message names each problem and the time of the last good run. Nothing is sent when all is well. The topic is a secret named `ntfy_topic` in Supabase Vault (`select vault.create_secret('<topic>', 'ntfy_topic')`), never in the repo; whoever knows it can read the alerts, so keep it random. Email via Resend is the alternative if push is not wanted (§17.3).
  Test it: `select worker_health_problems();` lists what is wrong now; `select worker_health_check(true);` sends if anything is.
* **Backups:** Supabase daily backups; raw files 30 days in Storage (worker deletes older ones at the end of each run; a file a recent run still points at is kept).
* **Environments:** one Supabase project for production, one for development; migrations in `supabase/migrations`, applied with the Supabase CLI.

## 15. Repo layout

```
packages/shared/src/domain/   Listing (zod), places, travel time rules, sanity checks
packages/shared/src/travel/   TravelTimeService, SL client, travel_times cache, travel-times request handler (worker and Deno)
packages/shared/src/format/   the DESIGN.md formats, used by worker and web
apps/worker/src/http.ts       the only network client: timeouts, retries, per host politeness
apps/worker/src/sources/      SourceAdapter base class + one subclass per site
apps/worker/src/main.ts       dry run: fetch + validate to out/<date>/, no database (`npm run fetch`)
apps/worker/src/run.ts        the daily run: full pipeline to Supabase (`npm run worker`)
apps/worker/src/services/     Pipeline, SourceSync (upsert/removal rules), duplicates, clock
apps/worker/src/store/        repository interfaces; Supabase implementation (the only SQL); in-memory one for tests
apps/worker/fixtures/         20 real items per source (photos removed), used by tests 1 and 2
apps/worker/test/             tests 1 and 2 of §13 (node:test)
apps/worker/systemd/          daily timer for this laptop + install.sh
apps/web/                     React app (step 5)
supabase/migrations/          SQL in §5
supabase/functions/           travel-times (thin Deno wrapper); later extract-fb, stripe-webhook, notify (steps 3, 6)
legacy/                       old pipeline, still running
DESIGN.md                     page spec (UI)
ARCHITECTURE.md               this file
```

Legacy files live in `legacy/` until the step that retires them (§16); only their workflows stay in `.github/workflows/`, running inside `legacy/`.

## 16. Moving from today's setup

| Step | Result | Today's piece retired |
| --- | --- | --- |
| 1 | Supabase project, migrations, shared package. **Done:** shared package, worker adapters (dry run verified 23 nov: 2 356 listings, 0 invalid), migration written. **Open:** hosted Supabase project (migrations applied and types generated on local Supabase). Fixtures and test 1 done | |
| 2 | Worker with the four site adapters writing to Supabase; runs next to the old task for a week, counts compared. **Done (verified on local Supabase 23 nov: 2 355 listings, second run changes nothing):** pipeline, duplicates, coverage check, test 2, Supabase repositories, systemd timer. **Done:** unchanged raw responses are not stored again, 30 day raw retention, and the alert when runs stop or coverage collapses (§14). **What remains of step 2** is the week of running next to the old task | |
| 3 | Facebook through the worker + `extract-fb` | GitHub Actions `facebook.yml`, Claude reading posts |
| 4 | `travel-times` (phase 1). **Done:** shared service, worker step, edge function, test 4. **Open:** compare with legacy for a week, then retire | `routes.yml`, `routes.py`, `fb_eta.py` |
| 5 | React app reading Supabase, same look as today | `index.html`, JSON files, GitHub Pages |
| 6 | Auth, pins, Stripe, alerts | scheduled Claude task |

## 17. Open questions

1. Price and trial length for the paid plan.
2. Which pin features are free (one custom pin as a taste?) and which are paid.
3. Alert channel: email only, or also web push.
4. Domain name.
5. Which other sites to add later (Blocket Bostad, Bofrid, Hyresbostad.se, Homii).
