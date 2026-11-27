-- The free default pin moves from Karlaplan to T-Centralen and is called centrum (59.331, 18.062 at 3 decimals).
-- The page reads listings_centrum; listings_karlaplan stays as the same view until the page has moved over, then a
-- later migration drops it. Safe to apply before the worker has rebuilt the matrix: centrum_minutes() reads the old
-- 'karlaplan' row until the 'centrum' row exists.

create or replace function is_centrum(lat numeric, lon numeric) returns boolean
  language sql immutable as $$ select lat = 59.331 and lon = 18.062 $$;
grant execute on function is_centrum(numeric, numeric) to anon, authenticated;

drop policy if exists "own destinations, custom pins need a subscription" on destinations;
create policy "own destinations, custom pins need a subscription" on destinations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (is_centrum(round(lat, 3), round(lon, 3)) or is_paying(auth.uid())));

-- the page may read centrum's minutes, nothing else of the matrix
create or replace function centrum_minutes() returns table (place_id int, minutes smallint)
  language sql stable security definer set search_path = public as $$
  select u.place_id, u.minutes
  from travel_matrix m, unnest(m.place_ids, m.minutes) as u(place_id, minutes)
  where m.profile = 'weekday_0800'
    and m.cell = (case when exists (select 1 from travel_matrix where cell = 'centrum') then 'centrum' else 'karlaplan' end)
$$;
revoke all on function centrum_minutes() from public;
grant execute on function centrum_minutes() to anon, authenticated, service_role;

create view listings_centrum with (security_invoker = true) as
  select l.id, l.source, l.source_id, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags, l.first_seen,
         p.lat, p.lon, p.exact, k.minutes,
         coalesce((select array_agg(distinct c.source order by c.source) from listings c
                   where c.same_as = l.id and c.removed_at is null), '{}') as also_on,
         l.place_id
  from listings l
  join places p on p.id = l.place_id
  left join centrum_minutes() k on k.place_id = l.place_id
  where l.removed_at is null and l.same_as is null;
grant select on listings_centrum to anon, authenticated, service_role;

-- the old name, for the page until it reads listings_centrum
create or replace view listings_karlaplan with (security_invoker = true) as select * from listings_centrum;
grant select on listings_karlaplan to anon, authenticated, service_role;

drop function if exists karlaplan_minutes();
drop function if exists is_karlaplan(numeric, numeric);
