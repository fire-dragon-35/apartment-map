-- source_status: the number of runs is replaced by the number of different listings collected over all runs.
drop view source_status;
create view source_status as
with latest as (
  select distinct on (sr.source)
         sr.run_id, sr.source, r.started_at, r.finished_at, sr.complete, sr.pages, sr.fetched, sr.skipped,
         sr.invalid, sr.kept, left(sr.error, 200) as error, sr.duration_ms
  from source_runs sr join runs r on r.id = sr.run_id
  order by sr.source, sr.run_id desc
)
select l.source, l.started_at, l.finished_at, l.complete, l.pages, l.fetched, l.skipped, l.invalid, l.kept,
       l.error, l.duration_ms,
       -- the same yardstick as worker_health_check: median of the 7 complete runs before this one
       u.median as usual_kept, u.n as usual_runs,
       (select max(r2.finished_at) from source_runs e join runs r2 on r2.id = e.run_id
         where e.source = l.source and e.complete) as last_complete_at,
       (select count(*) from listings x where x.source = l.source and x.removed_at is null and x.same_as is null) as active,
       -- successful: the source was complete and its run finished
       (select e.kept from source_runs e join runs r3 on r3.id = e.run_id
         where e.source = l.source and e.complete and r3.finished_at is not null
         order by e.run_id desc limit 1) as last_complete_kept,
       -- every different flat any run has collected, removed ones included
       (select count(*) from listings x where x.source = l.source and x.same_as is null) as total_listings
from latest l
left join lateral (
  select round(percentile_cont(0.5) within group (order by e.kept)) as median, count(*) as n
  from (select kept from source_runs e where e.source = l.source and e.complete and e.run_id < l.run_id
        order by e.run_id desc limit 7) e
) u on true;

grant select on source_status to anon, authenticated;
