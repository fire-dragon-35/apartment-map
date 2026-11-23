-- ARCHITECTURE.md §14: a warning that works even when the laptop is dead, so it lives in Supabase.
-- pg_cron runs worker_health_check() every morning at 09:00 Stockholm time; it sends one push through ntfy.sh
-- (pg_net) when the worker has stopped or a run or a source is bad. The topic is a secret in Vault, never in the repo:
--   select vault.create_secret('<secret topic name>', 'ntfy_topic');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- What is wrong right now, one sentence each. Empty = healthy.
create function worker_health_problems() returns text[]
  language plpgsql stable security definer set search_path = public as $$
declare
  stamp constant text := 'Dy DD Mon HH24:MI';
  last_run runs;
  last_good timestamptz;
  problems text[] := '{}';
  s record;
begin
  select max(finished_at) into last_good from runs where ok;
  select * into last_run from runs order by id desc limit 1;

  if last_good is null or last_good < now() - interval '36 hours' then
    problems := problems || ('No run has finished ok in 36 hours. Last good run: '
      || coalesce(to_char(last_good at time zone 'Europe/Stockholm', stamp), 'never') || '.');
  end if;

  -- last run not ok; a run still unfinished after 3 hours counts as dead
  if last_run.id is not null and last_run.ok is distinct from true
     and (last_run.finished_at is not null or last_run.started_at < now() - interval '3 hours') then
    problems := problems || ('The last run (' || to_char(last_run.started_at at time zone 'Europe/Stockholm', stamp)
      || ') was not ok' || case when last_run.finished_at is null then ' (it never finished)' else '' end
      || '. Last good run: ' || coalesce(to_char(last_good at time zone 'Europe/Stockholm', stamp), 'never') || '.');
  end if;

  -- coverage of the last run's sources: incomplete, 0 ads, or under half the median of the 7 earlier complete runs
  for s in
    select sr.source, sr.complete, sr.kept, sr.error, m.median, m.n
    from source_runs sr
    left join lateral (
      select percentile_cont(0.5) within group (order by e.kept) as median, count(*) as n
      from (select kept from source_runs e where e.source = sr.source and e.complete and e.run_id < sr.run_id
            order by e.run_id desc limit 7) e
    ) m on true
    where sr.run_id = last_run.id
    order by sr.source
  loop
    if not s.complete then
      problems := problems || (s.source || ': incomplete fetch' || coalesce(' (' || s.error || ')', '') || '.');
    elsif s.kept = 0 then
      problems := problems || (s.source || ': returned 0 ads.');
    elsif s.n >= 3 and s.kept < s.median / 2 then
      problems := problems || (s.source || ': ' || s.kept || ' ads, under half of the usual ' || round(s.median) || '.');
    end if;
  end loop;

  return problems;
end $$;

-- Send one push when something is wrong. The cron job calls it at 07:00 and 08:00 UTC and it acts only when it is
-- 09:00 in Stockholm, so daylight saving time needs no job changes. `force` skips that check (manual test).
create function worker_health_check(force boolean default false) returns text
  language plpgsql security definer set search_path = public, extensions as $$
declare
  topic text;
  problems text[];
begin
  if not force and extract(hour from now() at time zone 'Europe/Stockholm') <> 9 then
    return 'not 09:00 in Stockholm';
  end if;

  problems := worker_health_problems();
  if cardinality(problems) = 0 then return 'healthy'; end if;

  select decrypted_secret into topic from vault.decrypted_secrets where name = 'ntfy_topic';
  if topic is null then
    raise exception 'worker is unhealthy (%) but no ntfy_topic secret in Vault', array_to_string(problems, ' ');
  end if;

  perform net.http_post(
    url     := 'https://ntfy.sh/',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := jsonb_build_object('topic', topic, 'title', 'Lägenhetskartan: worker problem',
                                  'message', array_to_string(problems, E'\n'), 'priority', 4, 'tags', jsonb_build_array('warning'))
  );
  return array_to_string(problems, E'\n');
end $$;

-- only the cron job (postgres) and the service role may run these
revoke all on function worker_health_problems(), worker_health_check(boolean) from public, anon, authenticated;
grant execute on function worker_health_problems(), worker_health_check(boolean) to service_role;

select cron.schedule('worker-health-check', '0 7,8 * * *', $$select worker_health_check()$$);
