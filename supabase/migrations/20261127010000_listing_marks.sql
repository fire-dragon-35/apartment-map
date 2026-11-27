-- Plus: a listing the user has checked off (seen, not interested or applied) is shown grey (DESIGN.md §14).
-- One row per user and listing; the user reads and removes their own, and only a paying user adds one.
create table listing_marks (
  user_id    uuid   not null references auth.users on delete cascade,
  listing_id bigint not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table listing_marks enable row level security;
create policy "own marks" on listing_marks for select using (user_id = auth.uid());
create policy "own marks, removable" on listing_marks for delete using (user_id = auth.uid());
create policy "new marks, paying users" on listing_marks for insert
  with check (user_id = auth.uid() and is_paying(auth.uid()));
grant select, insert, delete on listing_marks to authenticated;
