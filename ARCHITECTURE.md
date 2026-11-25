# ARCHITECTURE.md · Lägenhetskartan

> `CORE.md` is the fixed part and wins over this file. This file describes the current system: keep it true when you change it.

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

The SQL below is the design; `supabase/migrations/` is the source of truth and also holds the `active_listings` view, the helper functions `is_karlaplan` / `is_paying`, `listings.content_hash`, `source_runs.skipped/invalid/pages` (`pages` = raw pages fetched), the public view `source_status` (latest run per source: times, completeness, pages, fetched/kept/skipped/invalid, a short error, the median of the 7 earlier complete runs, active listings; `runs` and `source_runs` themselves stay private) and `subscriptions.last_event_id`. The private Storage bucket `raw` is created by its own migration.

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

-- travel time matrix (phase 1.5, §8): one row per destination cell, arrays aligned
create table travel_matrix (
  cell text not null,                 -- H3 cell (resolution 8) of the destination
  profile text not null,              -- 'weekday_0800'
  place_ids int[] not null,
  minutes smallint[] not null,        -- restid from each place to the cell, §8; an element is null when unreachable
  gtfs_hash text not null,            -- timetable hash and rules version the row was computed from
  computed_at timestamptz not null default now(),
  primary key (cell, profile),
  check (cardinality(place_ids) = cardinality(minutes))
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
| travel_matrix | none | none | none (through the function) | read / write (service key) |
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
   5b. The travel time matrix (§8, phase 1.5) is brought up to date: a full rebuild when the timetable or the grid changed, otherwise only the places that have no row. Logged as cells, places computed and seconds. A failure here never fails the run either.
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
* **Phase 1.5 (custom pins fast): a matrix computed once a day on the laptop.** SL is one-to-one: 1 844 places took 14 minutes, so a pin would need minutes and could hit the edge function time limit. Instead the worker precomputes travel times from every active place to every cell of a grid, and a custom pin becomes one database read.
  1. **Grid:** H3 resolution 8 (about 460 m edge) cells whose centre lies within 20 km of Karlaplan, about 2 270 cells (a cell here is 0.55 km²). A pin maps to its cell with `cellOf`. The parameters (`resolution`, `radiusKm`, centre) are in one place, `packages/shared/src/travel/grid.ts`; the worker, the function and the router input all derive from it. A pin outside the grid has no row and gets `failed` for every id.
  2. **Router:** r5py (Conveyal R5) on the laptop, run by the worker as a subprocess (`apps/worker/router/`, Python, own `requirements.txt`, Java 21). Inputs, cached under `apps/worker/cache/` (gitignored): the Trafiklab *GTFS Regional* feed for `sl` (key `TRAFIKLAB_GTFS_KEY` in `.env`; the key allows 60 requests per 30 days, so one round a day: a conditional request, with the `Accept-Encoding: gzip` header the API demands, and at most one retry, only after a network error or a 5xx, never after a 4xx; a failed round counts as the day's attempt and the cached feed is used meanwhile) and Geofabrik `sweden-latest.osm.pbf` cropped with osmium to the 20 km box plus a margin (downloaded again after 30 days). `setup.sh` installs the venv and, without a system Java, a user level JDK.
  3. **Matrix:** origins are the active places at their exact coordinates, destinations the cell centres; weekday, departure window 07:30 to 08:00, the 25th percentile of the travel times over the window (`MATRIX_PERCENTILE`; the choice is in item 9), modes TRANSIT and WALK, for the next weekday like phase 1. The stored value stays DESIGN.md §6: `minutes = travelMinutes(walkMinutes(place, cellCentre), r5)`, with the walk as the fallback when R5 finds no trip **and the walk is at most 60 minutes**; with no trip and a longer walk the place is unreachable from that cell and `minutes` is null (never a value like 1 500). R5 returns raw transit minutes; the rule is applied in TypeScript, once, in `packages/shared`.
  4. **Incremental and deterministic:** a full rebuild only when the timetable hash, the grid or the rules version (`MATRIX_RULES`) changes; `gtfs_hash` holds `<hash>.r<rules>`; otherwise only places without a row are computed (one-to-many) and appended to every cell row. Places that are no longer active are not rewritten; the read only asks for ids it wants. The timetable hash covers the feed's file names, sizes and CRCs except `feed_info.txt`, so a re-published identical feed does not trigger a rebuild. Every row carries `gtfs_hash` and `computed_at`. A row set is written with the reference cell last, so a run that dies half way is detected and repaired by the next one.
  5. **Storage:** `travel_matrix` (§5), about 2 270 rows of about 1 900 pairs. Row level security is on and no policy exists: anon and signed-in users cannot read it; only the function's service client does.
  6. **Function:** the Karlaplan cell is unchanged (SL with legs, cached in `travel_times`). A custom pin passes the same paywall, is mapped to its cell and answered from one `travel_matrix` row for the requested `placeIds`, with `legs: null` and `approx: true`; an id missing from the row, a null (unreachable) entry, or a missing row goes to `failed`, and SL is never called in bulk for a custom pin. A second request shape `{ lat, lon, placeId }` returns the exact SL trip with legs for one listing (the card the user opens), cached in `travel_times` as before, behind the same paywall. The page shows the approximate matrix minutes with "ca" in front (the cell centre can be up to 460 m from the pin), and the opened card uses the exact SL trip; Karlaplan stays on exact SL everywhere.
  7. **Measured (23 nov, this laptop, 8 cores, 7.5 GB):** first full build 13.6 min (OSM crop 51 s once, network 158 s once, routing 586 s, write 11 s), peak 4.0 GB (JVM capped at 3 GB); a full rebuild with the network cached 11.4 min on production (routing 646 s, write 27 s), whole worker run peak 3.2 GB; an incremental day with 20 new places 31 s, peak 2.8 GB; nothing to do 4 s. Matrix: 2 269 rows of 1 842 places, 27 MB. 3.16 of 4.18 million pairs have an R5 trip; the rest fall back to walking (cells over water, places R5 cannot snap, trips over 120 min). Function, 300 ids, custom pin: 300 to 740 ms on production (median about 500 ms), 70 to 85 ms locally; one exact SL trip for a listing about 6 s uncached.
  8. **Accuracy.** A pin is answered for its cell centre, up to 460 m away (5 to 6 minutes of walking by DESIGN.md §6), so the matrix is an approximation and says so (`approx: true`). Against SL for the Karlaplan point, which sits 382 m from its cell centre (nearly the worst case): median difference 6 min, 90th percentile 12, 1 229 of 1 844 places over 5 min. Against SL computed to the same cell centre (200 places) the router itself is closer: median 3 min, 90th percentile 11, 52 over 5 min; the matrix is the slower one in 166 of 200 (R5's median includes waiting for the first vehicle, SL's "fastest of 3" does not). Outliers are places where R5 finds no trip within 120 min and the walking fallback gives a meaningless large number; they are above any filter. The timetable hash is expected to change whenever Trafiklab publishes new content (the feed is rebuilt every night), which makes a full rebuild a daily event unless the content hash proves stable; the first week of runs shows which.
  9. **Percentile (decided 23 nov).** The first build used the median and came out about 3 minutes slower than SL (R5's median includes waiting for the first vehicle; SL's "fastest of 3" does not). The same 200 places, routed to the Karlaplan cell centre at p50 and p25 with the unreachable rule, against exact SL to the same point:

     | | compared | median abs diff | mean | p90 | over 5 min | signed median | slower / equal / faster |
     | --- | --- | --- | --- | --- | --- | --- | --- |
     | p50 | 187 | 2 | 4.56 | 9 | 40 | +2 | 152 / 15 / 20 |
     | p25 | 188 | 2 | 3.72 | 7 | 28 | +1 | 103 / 40 / 45 |

     The median absolute difference ties, so the tie is broken on the other measures, all better at p25; **p25 is stored.** The accuracy figures in item 8 are from the median build and remain the reference for the cell offset. A change of percentile, walk limit or any rule bumps `MATRIX_RULES` and rebuilds every row.
* **Phase 2 (when needed):** OpenTripPlanner with Trafiklab's open GTFS data for Stockholm and OpenStreetMap streets, on a small server. One request answers a pin to all places in about a second, with real walking times. Same function signature, so the page does not change.

Karlaplan times are computed by the worker for every new place and are free; other pins require a paying user.

## 9. Web app

* **Stack:** Vite + React + TypeScript on **Frame** (`vendor/frame`, a git submodule pinned to one commit and never edited here: layout primitives from `@frame/core`, controls from `@frame/ui`, theme through `@frame/themes`), CSS Modules, Leaflet (react-leaflet), PostgREST over plain `fetch` (`src/app/api.ts`, anon key, row level security; no supabase-js or TanStack Query in the page, they were half its JavaScript for one GET). Hosted on Vercel. No state library: React state. Composition and folder rules: DESIGN.md §12; Frame's own rules: `vendor/frame/AGENTS.md`.
* **Behaviour and look:** exactly `DESIGN.md` (v3, locked): one scrolling page, map on top, list below, one Leaflet popup, `Visa resväg`. Formats, price bands, source and line colours, the walk rule, the contract rule, the pin radius and the note tags live in `packages/shared` and are never repeated in the app; the design tokens are set as CSS variables from the same shared constants.
* **Step 5 scope:** Karlaplan only. Own pins, sign in and payment (step 6) have seams but no code; Facebook listings (step 3) are not shown yet.
* **Data loading:** one read of the view `listings_karlaplan` (migration `20261124030000`): active listings, copies hidden, with `source_id`, the Karlaplan travel time and legs, and `also_on` (the other sites that list the same flat). The view holds every active, non-duplicate listing (migration `20261125010000` removed the cuts on restid, rent and size, because every slider now ends in no limit); the page loads it whole (paged past 1 000 rows; the request starts when the module loads, in parallel with React and Leaflet, one retry), once per page load, and filters on the client (filter changes are deferred with `useDeferredValue`, so slider drags stay smooth; the URL query and `localStorage` are written 300 ms after the last change). `restid` is computed in the page from the exact position as DESIGN.md §6 says: `travelMinutes(walkMinutes(listing, Karlaplan), transit_min)`. "Ny" is `first_seen` equal to today in Stockholm (R8). Missing values render as `?` or not at all; a null never crashes the page. Route lines come from `legs`; with no legs and walking faster nothing is drawn.
* **Datakällor:** a second read at module load, of the view `source_status` (one row per source), shown under the list as a status line that opens to one block per site (DESIGN.md §4.5). Rules in `features/data/status.ts`: complete and last complete run within 36 hours is fine; incomplete, old or under half of the usual count is named in the line. It says only what the worker knows: all pages fetched without error, not that the site showed everything. Facebook is listed as not included until step 3.
* **Structure** (`apps/web/src`), the legacy class split as React pieces: `useListings` (data hook), `Listing` (a row with its rules: restid, new, contract, radius, tags), `useFilters` (state in the URL query so a view can be shared, the sliders and `Visa resväg` also remembered in `localStorage` as `lgh-filters` and `lgh-routes`), `MapView` (one Leaflet map, canvas pins in their own pane at z-index 450 with tolerance 8, rings, Karlaplan, one popup instance, preclick closes), `RouteLayer`, `ListView`, `Card`, `Details` (the three lines shared by card and popup), `Popup`.
* **Test hooks:** a build made with `--mode test` exposes `window.__lgh` (listings, selection, map, markers, route layer) for the page rules test; the production build has no hooks.
* **Later screens (step 6):** sign in (Supabase Auth), pin editor (drag a pin, name it; paid), saved searches and alerts (paid), account with Stripe Customer Portal link. For another pin the page calls `travel-times` (§8) with the ids of listings that pass the other filters.

## 10. Payments

> Now provided by Frame: `@frame/supabase` (client) and its synced backend (`supabase/migrations/20260101000000_frame_billing.sql`, `supabase/functions/frame-*`); `is_paying` calls `frame_is_active`. Text below is the original plan.

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
| **Page rules:** `apps/web/test/design.test.ts` (the legacy `design_check.py` ported to Playwright) runs the built app on a fixture of about 30 listings, Supabase mocked, and checks R1 to R12 of DESIGN.md; it needs Chromium (`npx playwright install chromium`) | interaction and format regressions |
| **Paywall:** an anonymous and a free user cannot read other pins' travel times or other users' rows, and cannot read `travel_matrix`, and get 402 from `travel-times` for a custom pin; a paying user gets minutes from a fixture matrix row (bulk) or the exact cached SL trip (one listing). Runs against local Supabase (`npx supabase start`) and is skipped, visibly, without it | data or paid features leaking |
| **Stripe webhook:** the same event twice gives one subscription row in the right state | double or lost subscriptions |

Plus the type checker and linter. Everything else is covered by the coverage alerts in section 6.

## 14. Operations

* **Secrets:** `.env` on the laptop (Supabase service key, Apify token, `TRAFIKLAB_GTFS_KEY`); Supabase function secrets (Claude, Stripe, SMTP). Never in the repo.
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
apps/worker/router/           r5py matrix builder (Python subprocess), requirements.txt, setup.sh
apps/worker/cache/            GTFS, cropped OSM, JDK (gitignored)
apps/web/                     React app on Frame: src/app, src/features/{listings,filters,map}, test/ (page rules); DESIGN.md §12
vendor/frame/                 Frame, git submodule (read only)
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
| 4 | `travel-times` (phase 1). **Done (23 nov):** shared service, worker step, edge function deployed, test 4; first run computed 1 844 places in 14 min with 0 failed, and SL minutes match legacy `t` within 1 minute for all 77 shared listings. **Phase 1.5 done (23 nov, §8 for the numbers):** matrix for custom pins on production, full build 11 to 14 min, incremental day 31 s, 27 MB, custom pin with 300 ids 300 to 740 ms, accuracy against SL: median 3 min to the same cell centre, 6 min to the Karlaplan point. **Open:** run next to legacy for a week, then retire; percentile decided (p25, §8 item 9); the first 06:30 run after this change is a full rebuild | `routes.yml`, `routes.py`, `fb_eta.py` |
| 5 | React app reading Supabase, same look as today. **Done (23 nov, not deployed):** `apps/web` on the view `listings_karlaplan` (applied to production); test 3 (R1 to R12) passes on a fixture; 193 KB gzipped JS, 145 KB gzipped data (194 rows), first pins about 2.1 s on Fast 4G (9 Mbps, 60 ms; median of 5 cold loads); against the legacy page for 23 nov, 74 listings are in both and restid is identical in 72 and within 1 min in all 74; the rest is explained in the step report. **Open:** deploy on Vercel (§9), a week next to the legacy page, then retire it | `index.html`, JSON files, GitHub Pages |
| 6 | Auth, pins, Stripe, alerts | scheduled Claude task |

## 17. Open questions

1. Price and trial length for the paid plan.
2. Which pin features are free (one custom pin as a taste?) and which are paid.
3. Alert channel: email only, or also web push.
4. Domain name.
5. Which other sites to add later (Blocket Bostad, Bofrid, Hyresbostad.se, Homii).
