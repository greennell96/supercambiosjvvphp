-- Sendings: the daily log. One row per money transfer sent for a client.
--
-- A sending is filled in over TWO moments:
--
--   1. When it is logged, only the client-facing side is known: how much EUR
--      came in, at what tasa, and therefore how many bolivares the beneficiary
--      must receive. The cost columns are NULL at this point.
--
--   2. When it is actually paid — later, usually in a batch — the funding is
--      known, so fee_applied / usdt_used / cost_eur / profit_eur / paid_via get
--      filled in. See lib/pricing.ts.
--
-- Nothing is ever recomputed after step 2.

create table if not exists sendings (
  id                bigserial primary key,
  client_id         bigint         not null references clients (id),
  created_at        timestamptz    not null default now(),

  amount_eur        numeric(20, 8) not null,   -- what the client handed over, in EUR
  payout_method     text           not null,   -- a bank name, or 'Pago Movil', or 'Otro'
  status            text           not null default 'pending',
  paid_at           timestamptz,

  -- The tasa Jose typed for THIS sending. Not copied from current_rates: that
  -- row only prefills the input box.
  rate_tasa         numeric(20, 8) not null,

  -- amount_eur * rate_tasa. This is the number to actually pay the beneficiary,
  -- and it never changes afterwards.
  amount_ves_to_pay numeric(20, 8) not null,

  -- ---- everything below is NULL until the sending is marked paid ----

  -- How it was funded:
  --   'pool'   -> paid out of the bolivares already in Jose's VE account
  --               (drawn from ves_sales, see sending_ves_allocations)
  --   'direct' -> USDT sold on Binance straight into the beneficiary's account,
  --               so the bolivares never touched the pool
  paid_via          text,

  -- true only when paid from the pool AND payout_method is 'Pago Movil'/'Otro'.
  -- That 0,3% is Jose's interbank cost for moving pooled bolivares to another
  -- bank; the beneficiary still receives exactly amount_ves_to_pay.
  fee_applied       boolean,

  -- USDT this sending really consumed.
  --   pool   -> sum over the VES lots drawn of (ves drawn / that lot's VES-per-USDT price)
  --   direct -> exactly the USDT Jose says he sold
  usdt_used         numeric(20, 8),

  -- Real EUR cost of that USDT, from walking the crypto_purchases pool
  -- (see sending_lot_allocations).
  cost_eur          numeric(20, 8),

  -- amount_eur - cost_eur.
  profit_eur        numeric(20, 8),

  constraint sendings_status_check   check (status in ('pending', 'paid')),
  constraint sendings_paid_via_check check (paid_via is null or paid_via in ('pool', 'direct')),

  -- A paid sending must say how it was funded, and a pending one must not.
  constraint sendings_paid_shape_check check (
    (status = 'pending' and paid_via is null and paid_at is null)
    or
    (status = 'paid' and paid_via is not null and paid_at is not null)
  )
);

create index if not exists sendings_created_at_idx on sendings (created_at desc);
create index if not exists sendings_status_idx on sendings (status);
create index if not exists sendings_client_idx on sendings (client_id);
