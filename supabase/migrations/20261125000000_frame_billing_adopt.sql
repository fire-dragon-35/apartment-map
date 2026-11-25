-- Billing moves to Frame (@frame/supabase, migration 20260101000000_frame_billing): frame_subscriptions, written by
-- the frame-stripe-webhook Edge Function. is_paying keeps its name for the existing policies and travel-times.
create or replace function is_paying(uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$ select frame_is_active(uid) $$;

-- the old table never had rows (no payments before Frame)
drop table if exists subscriptions;
