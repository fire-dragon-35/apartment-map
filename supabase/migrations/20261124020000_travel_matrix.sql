-- ARCHITECTURE.md §8, phase 1.5: restid from every active place to every cell of the grid, one row per destination cell.
-- Written by the worker once a day (service role); read only by the travel-times function (service role).
create table travel_matrix (
  cell        text not null,                -- H3 cell, resolution 8
  profile     text not null,                -- 'weekday_0800'
  place_ids   int[] not null,
  minutes     smallint[] not null,          -- aligned with place_ids: min(walk, transit), DESIGN.md §6
  gtfs_hash   text not null,                -- timetable the row was computed from
  computed_at timestamptz not null default now(),
  primary key (cell, profile),
  check (cardinality(place_ids) = cardinality(minutes))
);

-- Row level security on and no policy: anon and signed-in users cannot read it, the paywall cannot be bypassed
-- through the REST API. The service role bypasses row level security.
alter table travel_matrix enable row level security;
revoke all on travel_matrix from anon, authenticated;
