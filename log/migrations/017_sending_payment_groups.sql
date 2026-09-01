-- One client payment may cover several payout rows.
--
-- A sending still has its own primary key, beneficiary-payment lifecycle and
-- allocation trails. payment_group_id is the shared identity of the client-side
-- obligation: every row created from one pre-creation division carries the same
-- UUID, and one codigo may prove payment for that whole group.

alter table sendings add column if not exists payment_group_id uuid;

-- Historical rows cannot be matched back into old split families reliably.
-- Give each one a stable, independent group and preserve every existing link.
update sendings
set payment_group_id = md5('sending:' || id::text)::uuid
where payment_group_id is null;

alter table sendings alter column payment_group_id set not null;
-- Keeps the currently deployed pre-017 code able to insert during the short
-- migration -> deployment window. New code supplies its own UUID explicitly.
alter table sendings alter column payment_group_id set default gen_random_uuid();

create index if not exists sendings_payment_group_idx
  on sendings (payment_group_id);

alter table codigos add column if not exists sending_group_id uuid;

update codigos g
set sending_group_id = s.payment_group_id
from sendings s
where g.sending_id = s.id
  and g.sending_group_id is null;

-- One codigo proves at most one group, and one group has at most one codigo.
-- The existing sending_id remains the representative row used by /codigos.
create unique index if not exists codigos_sending_group_unique_idx
  on codigos (sending_group_id) where sending_group_id is not null;

-- Keep the group derived from the representative sending at the database
-- boundary. This is also the compatibility bridge for the currently deployed
-- pre-017 bundle: its writes know only sending_id, and ON DELETE SET NULL must
-- clear both columns rather than leave an orphaned group link.
create or replace function sync_codigo_sending_group()
returns trigger
language plpgsql
as $$
begin
  if new.sending_id is null then
    new.sending_group_id := null;
  else
    select payment_group_id
    into new.sending_group_id
    from sendings
    where id = new.sending_id;
  end if;
  return new;
end;
$$;

drop trigger if exists codigos_sync_sending_group on codigos;
create trigger codigos_sync_sending_group
before insert or update of sending_id, sending_group_id on codigos
for each row execute function sync_codigo_sending_group();
