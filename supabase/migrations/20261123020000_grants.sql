-- Table privileges for the API roles. Newer Supabase projects no longer grant these automatically for tables
-- created in migrations, so without this even the service role gets "permission denied".
-- Privileges decide which role may touch a table at all; row level security (init migration) decides which rows.

grant usage on schema public to anon, authenticated, service_role;

-- worker and edge functions: everything (they bypass row level security)
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- the page: public data, narrowed further by the row level security policies
grant select on places, listings, travel_times, active_listings to anon, authenticated;
grant execute on function is_karlaplan(numeric, numeric), is_paying(uuid) to anon, authenticated;

-- signed in users: their own rows (policies restrict them to user_id = auth.uid())
grant select on profiles, subscriptions to authenticated;
grant select, insert, update, delete on destinations, saved_searches to authenticated;
grant usage on sequence destinations_id_seq, saved_searches_id_seq to authenticated;

-- tables added by later migrations get the same service role access
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
