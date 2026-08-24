-- Current rates: a singleton table. There is always exactly one row, with id = 1.
--
-- This holds ONE number now, and it is only a suggestion. Every sending carries
-- its own tasa, typed by hand at creation time, because the rate legitimately
-- varies per client and per time of day. This row just prefills that field with
-- whatever was used last, so the common case is one keystroke instead of five.
--
-- Nothing reads this table to decide money. The authoritative tasa for a sending
-- is sendings.rate_tasa.

create table if not exists current_rates (
  id           smallint       primary key default 1,
  tasa_eur_ves numeric(20, 8) not null,   -- suggested EUR -> VES rate for the next sending
  updated_at   timestamptz    not null default now(),

  -- Hard guarantee that a second row can never be inserted.
  constraint current_rates_singleton check (id = 1)
);

-- Seed the one row with zero. A zero here simply means "no suggestion yet";
-- it never blocks a sending, because the tasa is typed on the sending itself.
insert into current_rates (id, tasa_eur_ves)
values (1, 0)
on conflict (id) do nothing;
