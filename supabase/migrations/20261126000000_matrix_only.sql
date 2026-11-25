-- One source for every restid: the travel matrix (ARCHITECTURE.md §8). Karlaplan has its own row (cell 'karlaplan',
-- its exact point), written by the worker. SL is no longer called by anything; routes are gone, so are travel_times.
-- Apply after the worker has run once with this version (it rebuilds the matrix and adds the 'karlaplan' row).

-- the page may read Karlaplan's minutes, nothing else of the matrix
create or replace function karlaplan_minutes() returns table (place_id int, minutes smallint)
  language sql stable security definer set search_path = public as $$
  select u.place_id, u.minutes
  from travel_matrix m, unnest(m.place_ids, m.minutes) as u(place_id, minutes)
  where m.cell = 'karlaplan' and m.profile = 'weekday_0800'
$$;
revoke all on function karlaplan_minutes() from public;
grant execute on function karlaplan_minutes() to anon, authenticated, service_role;

drop view if exists listings_karlaplan;
create view listings_karlaplan with (security_invoker = true) as
  select l.id, l.source, l.source_id, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags, l.first_seen,
         p.lat, p.lon, p.exact, k.minutes,
         coalesce((select array_agg(distinct c.source order by c.source) from listings c
                   where c.same_as = l.id and c.removed_at is null), '{}') as also_on,
         l.place_id
  from listings l
  join places p on p.id = l.place_id
  left join karlaplan_minutes() k on k.place_id = l.place_id
  where l.removed_at is null and l.same_as is null;
grant select on listings_karlaplan to anon, authenticated, service_role;

-- active_listings (unused since the page reads listings_karlaplan) joined travel_times
drop view if exists active_listings;
drop table if exists travel_times;
