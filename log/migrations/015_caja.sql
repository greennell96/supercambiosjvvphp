-- La caja: the euros Jose physically has in hand, and the confirmation step that
-- feeds them.
--
-- Everything in this app so far has tracked value that lives somewhere else —
-- USDT on Binance, bolivares in a Venezuelan account, a codigo waiting at a
-- cajero. None of it says how much cash is in Jose's pocket, which is the number
-- he actually counts at the end of a day.
--
-- The design rule for that number is the one lib/reconciliation.ts already
-- states for the cuadre: nothing is stored that can be derived. The caja balance
-- is NOT a running total kept in a column and nudged on every write — a column
-- like that drifts the first time a row it was computed from is deleted or
-- corrected, and this schema already lets both happen (deleteCompra,
-- editarCodigoAction, deleteCodigo). It is re-derived on every read from the
-- rows that are the source of truth, and the two tables below exist only because
-- their facts have no source of truth anywhere else yet.
--
--   codigo_withdrawal_confirmations — what Jose COUNTED at the cajero, which the
--     codigos table cannot know: it holds what the codes were worth, not what
--     came out of the machine.
--   caja_manual_entries — money in or out of the pocket that no other table has
--     any reason to know about, plus the opening balance seeded at the bottom.
--
-- The other two ledger sources are read live and store nothing new: sendings the
-- client paid EFECTIVO, and the crypto_purchases column added below. That is why
-- deleting a compra needs no reversal code — the line is the row, so removing
-- the row removes the line.

-- ------------------------------------------- what came out of the cajero

-- One row per Europe/Madrid day, holding both figures rather than just the one
-- that matters.
--
-- counted_eur is the money: it is what went into the pocket, and it is the only
-- thing the caja ledger reads. system_eur is what the codigos said that same day
-- was worth at the moment of confirming, and it is kept purely so a later
-- disagreement is explainable — a retirado codigo's amount can still be
-- corrected through updateCodigo(), so the system total for a day is not frozen
-- and the panel has to be able to say "this moved since you confirmed it".
--
-- The day is the Madrid calendar day of retired_at, NOT created_at. That is the
-- one real difference from the cuadre de codigos in migration 006's table: the
-- cuadre asks what was WRITTEN DOWN on a day, this asks what was WITHDRAWN on
-- one, and those are routinely different days for the same codigo.
--
-- unique (day) is what makes re-confirming an overwrite instead of a second
-- opinion. Confirming again recomputes system_eur from scratch and replaces the
-- row, so a day can never contribute twice to the balance.
create table if not exists codigo_withdrawal_confirmations (
  id           bigserial      primary key,
  day          date           not null,
  system_eur   numeric(20, 8) not null,
  counted_eur  numeric(20, 8) not null,
  confirmed_at timestamptz    not null default now(),

  constraint codigo_withdrawal_confirmations_day_unique unique (day)
);

-- The panel sums retirado codigos per day over a four-day window, which is the
-- only query in the app that reads retired_at as anything but a display field.
create index if not exists codigos_retired_at_idx
  on codigos (retired_at) where status = 'retirado';

-- ----------------------------------------------- money the app cannot see

-- Cash in or out of the pocket that no other row explains: change given, a
-- personal expense paid out of the takings, a correction.
--
-- amount_eur is signed, one column rather than a magnitude plus a direction.
-- The ledger adds it up as it stands, so a positive row is money in and a
-- negative row is money out, and there is no second field that could disagree
-- with the sign. Zero is refused: a movement of nothing is a note, not an entry.
--
-- There is deliberately no delete and no edit. A cash book is corrected by
-- writing the opposite entry, not by rubbing out the wrong one, and that is also
-- what keeps the opening balance below out of reach.
create table if not exists caja_manual_entries (
  id         bigserial      primary key,
  created_at timestamptz    not null default now(),
  amount_eur numeric(20, 8) not null,
  note       text           not null,
  -- The seeded opening balance, and nothing else. Two jobs, both load-bearing:
  -- it is what lets the ledger label that line "Saldo inicial" instead of
  -- "Ajuste manual", and it is the cut-off the running balance starts from —
  -- see buildCajaLedger in lib/caja.ts.
  is_opening boolean        not null default false,

  constraint caja_manual_entries_amount_check check (amount_eur <> 0)
);

-- Exactly one opening balance, ever. Partial because false is the normal state
-- and there will be many of those.
create unique index if not exists caja_manual_entries_opening_unique_idx
  on caja_manual_entries (is_opening) where is_opening;

-- -------------------------------------------- compras paid out of pocket

-- Whether this purchase's euros came out of the caja rather than out of a bank.
--
-- A flag on the purchase and not a row in caja_manual_entries, because the
-- purchase IS the entry: its eur_paid is the amount and its purchased_at is the
-- date, and duplicating either into a second table would give one fact two
-- places to drift. The ledger reads this column live, so deleting a compra
-- removes its outflow with it and deleteCompra needs to know nothing about the
-- caja at all.
--
-- Set at creation only. /compras has no edit path by design, and this column
-- follows that shape rather than inventing one.
alter table crypto_purchases add column if not exists paid_from_cash boolean not null default false;

-- Every existing row defaults to false, which is the truthful backfill: before
-- this column there was no caja, so no purchase was ever recorded as coming out
-- of one.
create index if not exists crypto_purchases_paid_from_cash_idx
  on crypto_purchases (purchased_at) where paid_from_cash;

-- --------------------------------------------------- the opening balance

-- What Jose counted in his pocket the day this shipped: 1.740 €.
--
-- Seeded here rather than left to him to type, so the caja is correct the first
-- time the page is opened instead of after a manual step nobody would remember.
--
-- Dated to midnight Europe/Madrid of the day the migration runs, not to the
-- instant it runs. The balance walks forward from this line and every earlier
-- line is dropped (that is the whole point of it being the cut-off — the historic
-- EFECTIVO sendings already in the sendings table are money that has long since
-- been spent, and counting them again on top of the 1.740 would invent euros
-- that are not in the pocket). Midnight rather than now() so that a codigos
-- withdrawal confirmed for TODAY — which the ledger dates to the start of its
-- Madrid day — still lands after the opening line instead of falling off the
-- cut-off and disappearing.
insert into caja_manual_entries (created_at, amount_eur, note, is_opening)
select date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid',
       1740,
       'Saldo inicial de caja',
       true
where not exists (select 1 from caja_manual_entries where is_opening);
