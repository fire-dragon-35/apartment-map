-- ARCHITECTURE.md §9: the one read of the page (step 5). Active listings, copies hidden, with the Karlaplan travel time
-- and route legs, and the other sites that list the same flat.
--
-- Only rows the page can ever show: the sliders stop at 17 000 kr, 20 m² and 30 min (DESIGN.md §4). The page computes
-- the final restid itself from the exact position (DESIGN.md §6), which can differ by a minute from the cell value
-- stored here, hence 31. Unknown rent, size or travel time stay in; the page treats them as DESIGN.md says.
-- Wider limits than the sliders cost nothing; narrower ones would hide listings, so change them with the sliders.
create view listings_karlaplan with (security_invoker = true) as
  select l.id, l.source, l.source_id, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags, l.first_seen,
         p.lat, p.lon, p.exact,
         t.transit_min, t.minutes, t.legs,
         coalesce((select array_agg(distinct c.source order by c.source) from listings c
                   where c.same_as = l.id and c.removed_at is null), '{}') as also_on
  from listings l
  join places p on p.id = l.place_id
  left join travel_times t on t.place_id = l.place_id and is_karlaplan(t.dest_lat, t.dest_lon) and t.profile = 'weekday_0800'
  where l.removed_at is null and l.same_as is null
    and (l.rent is null or l.rent <= 17000)
    and (l.m2 is null or l.m2 >= 20)
    and (t.minutes is null or t.minutes <= 31);

grant select on listings_karlaplan to anon, authenticated;
