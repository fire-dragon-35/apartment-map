-- ARCHITECTURE.md §4: raw responses (gzip) from the worker, private, read and written with the service key only.
insert into storage.buckets (id, name, public) values ('raw', 'raw', false)
on conflict (id) do nothing;
-- No storage.objects policies: nobody but the service role can read or write the bucket.
