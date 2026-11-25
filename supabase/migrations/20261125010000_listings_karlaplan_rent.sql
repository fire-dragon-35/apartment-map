-- Every filter slider now ends in "no limit" (DESIGN.md §4), so the view no longer cuts on rent, size or travel time:
-- the page does that. Same columns as before, so the view is replaced in place.
create or replace view listings_karlaplan with (security_invoker = true) as
  select l.id, l.source, l.source_id, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags, l.first_seen,
         p.lat, p.lon, p.exact,
         t.transit_min, t.minutes, t.legs,
         coalesce((select array_agg(distinct c.source order by c.source) from listings c
                   where c.same_as = l.id and c.removed_at is null), '{}') as also_on
  from listings l
  join places p on p.id = l.place_id
  left join travel_times t on t.place_id = l.place_id and is_karlaplan(t.dest_lat, t.dest_lon) and t.profile = 'weekday_0800'
  where l.removed_at is null and l.same_as is null;
