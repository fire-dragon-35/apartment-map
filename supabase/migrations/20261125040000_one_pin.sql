-- One pin per user (CORE.md, simplified): Plus moves the pin from Karlaplan to an own place; no extra pins.
delete from destinations d using destinations o
  where d.user_id = o.user_id and d.id > o.id;   -- keep the oldest row per user

create or replace function destinations_limit() returns trigger language plpgsql as $$
begin
  if exists (select 1 from destinations where user_id = new.user_id) then
    raise exception 'En plats per konto' using errcode = 'check_violation';
  end if;
  return new;
end $$;
