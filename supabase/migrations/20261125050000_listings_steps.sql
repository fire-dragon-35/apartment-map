-- The page loads every listing, and `legs` carries each route's coordinates: about 3.8 MB per 1 000 rows. The cards
-- only need the steps (mode, line, minutes, stops), so the view gains `steps`: `legs` with the coordinates set to
-- null. The page reads `steps` for the list and fetches `legs` for the one selected listing whose route it draws.
-- Same columns as before plus `steps` at the end, so the view is replaced in place.
create or replace view listings_karlaplan with (security_invoker = true) as
  select l.id, l.source, l.source_id, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags, l.first_seen,
         p.lat, p.lon, p.exact,
         t.transit_min, t.minutes, t.legs,
         coalesce((select array_agg(distinct c.source order by c.source) from listings c
                   where c.same_as = l.id and c.removed_at is null), '{}') as also_on,
         l.place_id,
         (select jsonb_agg(jsonb_build_array(e->0, e->1, null, e->3, e->4) order by i)
            from jsonb_array_elements(t.legs) with ordinality as x(e, i)) as steps
  from listings l
  join places p on p.id = l.place_id
  left join travel_times t on t.place_id = l.place_id and is_karlaplan(t.dest_lat, t.dest_lon) and t.profile = 'weekday_0800'
  where l.removed_at is null and l.same_as is null;
