-- Paid features (CORE.md): own pins (destinations, at most 3), one saved search per user, a daily email with new
-- matches. Karlaplan stays free and needs none of this.

-- the page needs place_id to read custom pins' travel times (travel-times edge function, matrix); added at the end
create or replace view listings_karlaplan with (security_invoker = true) as
  select l.id, l.source, l.source_id, l.url, l.street, l.area, l.rent, l.m2, l.rooms, l.kpm,
         l.start_date, l.end_date, l.first_hand, l.student, l.furnished, l.notes, l.flags, l.first_seen,
         p.lat, p.lon, p.exact,
         t.transit_min, t.minutes, t.legs,
         coalesce((select array_agg(distinct c.source order by c.source) from listings c
                   where c.same_as = l.id and c.removed_at is null), '{}') as also_on,
         l.place_id
  from listings l
  join places p on p.id = l.place_id
  left join travel_times t on t.place_id = l.place_id and is_karlaplan(t.dest_lat, t.dest_lon) and t.profile = 'weekday_0800'
  where l.removed_at is null and l.same_as is null;

-- one saved search per user: the page's filters as JSON (PageFilters), its pins are the user's destinations
alter table saved_searches
  drop column if exists destination_id, drop column if exists max_minutes, drop column if exists max_rent,
  drop column if exists min_m2, drop column if exists min_months,
  add column if not exists filters jsonb not null default '{}'::jsonb,
  add column if not exists last_sent_on date;
alter table saved_searches drop constraint if exists saved_searches_one_per_user;
alter table saved_searches add constraint saved_searches_one_per_user unique (user_id);
drop policy if exists "own saved searches" on saved_searches;
drop policy if exists "own saved search, paying users" on saved_searches;
create policy "own saved search, paying users" on saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and is_paying(auth.uid()));

-- at most 3 pins per user
create or replace function destinations_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from destinations where user_id = new.user_id) >= 3 then
    raise exception 'Högst 3 platser' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists destinations_limit on destinations;
create trigger destinations_limit before insert on destinations for each row execute function destinations_limit();

grant select, insert, update, delete on destinations, saved_searches to authenticated;
grant usage on all sequences in schema public to authenticated;

-- 07:45 Stockholm in winter (06:45 UTC), after the 06:30 worker run: the notify-matches edge function.
-- Setup once (no-op until both exist):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify-matches', 'notify_url');
--   select vault.create_secret('<random string, same as the CRON_SECRET function secret>', 'notify_secret');
create or replace function notify_matches_run() returns void language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'notify_secret';
  if url is null or secret is null then return; end if;
  perform net.http_post(url := url, body := '{}'::jsonb,
    headers := jsonb_build_object('content-type', 'application/json', 'x-cron-secret', secret));
end $$;
select cron.schedule('notify-matches', '45 6 * * *', $$select notify_matches_run()$$);
