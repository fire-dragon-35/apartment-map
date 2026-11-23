-- ARCHITECTURE.md §5. One source of truth for the data; generated types and zod follow from this.

-- ---------- runs and coverage ----------
create table runs (
  id          bigint generated always as identity primary key,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean
);

create table source_runs (
  run_id      bigint not null references runs on delete cascade,
  source      text   not null,
  complete    boolean not null,           -- every page fetched without error
  fetched     int not null,
  kept        int not null,
  skipped     int not null default 0,
  invalid     int not null default 0,
  error       text,
  duration_ms int,
  raw_path    text,                       -- Storage key of the raw response
  primary key (run_id, source)
);

-- ---------- places and listings ----------
create table places (
  id    bigint generated always as identity primary key,
  lat   numeric(7,4) not null,
  lon   numeric(7,4) not null,
  exact boolean not null default true,    -- false = area centre (Facebook)
  unique (lat, lon)
);

create table listings (
  id          bigint generated always as identity primary key,
  source      text not null,
  source_id   text not null,
  url         text not null,
  place_id    bigint not null references places,
  street      text,
  area        text,
  rent        int,
  m2          numeric,
  rooms       numeric,
  kpm         int generated always as (case when m2 > 0 and rent is not null then round(rent / m2)::int end) stored,
  start_date  date,
  end_date    date,
  first_hand  boolean,
  student     boolean,
  furnished   boolean,
  notes       text[] not null default '{}',
  flags       text[] not null default '{}',
  content_hash text not null,             -- rows are written only when this changes
  first_seen  date not null,              -- set once, never changed
  last_seen   date not null,
  removed_at  date,                       -- set when a complete run no longer returns it
  same_as     bigint references listings, -- copy of the same flat on another site
  unique (source, source_id)
);
create index listings_active on listings (place_id) where removed_at is null;
create index listings_filters on listings (rent, m2) where removed_at is null;

create table listing_changes (
  listing_id bigint not null references listings on delete cascade,
  seen_at    date not null,
  field      text not null,
  old        text,
  new        text
);
create index listing_changes_listing on listing_changes (listing_id);

-- ---------- Facebook ----------
create table fb_posts (
  post_id           text primary key,
  group_name        text,
  posted_at         timestamptz,
  url               text not null,
  text              text not null,
  is_offer          boolean,             -- null until extracted
  extracted         jsonb,
  extractor_version int,
  listing_id        bigint references listings
);
create index fb_posts_pending on fb_posts (post_id) where extracted is null;

-- ---------- travel times ----------
create table travel_times (
  place_id    bigint not null references places on delete cascade,
  dest_lat    numeric(6,3) not null,     -- destination rounded to ~100 m
  dest_lon    numeric(6,3) not null,
  profile     text not null default 'weekday_0800',
  walk_min    int not null,
  transit_min int,
  minutes     int not null,              -- min(walk, transit)
  legs        jsonb,                     -- [mode, line, coords, minutes, stops]
  computed_at timestamptz not null default now(),
  primary key (place_id, dest_lat, dest_lon, profile)
);

-- ---------- users ----------
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table destinations (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users on delete cascade,
  label    text,
  lat      numeric(7,4) not null,
  lon      numeric(7,4) not null,
  arrive_by time not null default '08:00'
);

create table saved_searches (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users on delete cascade,
  destination_id bigint references destinations on delete set null,
  max_minutes    int,
  max_rent       int,
  min_m2         int,
  min_months     int,
  alerts         boolean not null default false
);

create table subscriptions (
  user_id             uuid primary key references auth.users on delete cascade,
  stripe_customer     text,
  stripe_subscription text,
  status              text,
  current_period_end  timestamptz,
  last_event_id       text               -- each Stripe event is applied once
);

-- ---------- helpers ----------
-- Karlaplan's cell: the free default destination.
create function is_karlaplan(lat numeric, lon numeric) returns boolean
  language sql immutable as $$ select lat = 59.339 and lon = 18.091 $$;

create function is_paying(uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s
    where s.user_id = uid and s.status in ('active', 'trialing') and s.current_period_end > now()
  ) $$;

-- What the page reads: active listings, cheapest copy of each flat, with the Karlaplan time.
create view active_listings with (security_invoker = true) as
  select l.id, l.source, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags,
         l.first_seen, p.lat, p.lon, p.exact,
         t.minutes, t.walk_min, t.transit_min, t.legs
  from listings l
  join places p on p.id = l.place_id
  left join travel_times t on t.place_id = l.place_id and is_karlaplan(t.dest_lat, t.dest_lon) and t.profile = 'weekday_0800'
  where l.removed_at is null and l.same_as is null;

-- ---------- row level security (ARCHITECTURE.md §5) ----------
-- The worker and edge functions use the service role, which bypasses these policies.
alter table runs            enable row level security;
alter table source_runs     enable row level security;
alter table places          enable row level security;
alter table listings        enable row level security;
alter table listing_changes enable row level security;
alter table fb_posts        enable row level security;
alter table travel_times    enable row level security;
alter table profiles        enable row level security;
alter table destinations    enable row level security;
alter table saved_searches  enable row level security;
alter table subscriptions   enable row level security;

create policy "public reads places"   on places   for select using (true);
create policy "public reads active listings" on listings for select using (removed_at is null);

create policy "Karlaplan times for everyone, other pins for paying users" on travel_times for select
  using (is_karlaplan(dest_lat, dest_lon) or is_paying(auth.uid()));

create policy "own profile" on profiles for select using (id = auth.uid());

create policy "own destinations, custom pins need a subscription" on destinations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (is_karlaplan(round(lat, 3), round(lon, 3)) or is_paying(auth.uid())));

create policy "own saved searches" on saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own subscription (read only)" on subscriptions for select using (user_id = auth.uid());
-- runs, source_runs, listing_changes, fb_posts: no policies = no access except the service role.
