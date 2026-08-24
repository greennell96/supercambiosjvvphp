-- Cost basis for the VES pool, and the audit trail behind it.
--
-- The chain is EUR -> USDT (crypto_purchases) -> VES (ves_sales) -> payout, so
-- each link is paid for exactly once, at the moment it happens. Until now the
-- USDT link was charged in the wrong place: registering a Binance sale did not
-- draw crypto_purchases at all, and the draw happened later, when a sending was
-- paid out of the pool. The same USDT ended up spent twice — once as bolivares
-- leaving the VES pool, once as USDT leaving a pool that never saw the sale.
--
-- From here on, a sale draws crypto_purchases for its usdt_sold and stores what
-- that draw cost, and a sending paid from the pool costs its bolivares straight
-- off the sales it drew (eur_cost / ves_received per bolivar), touching
-- crypto_purchases not at all.
--
-- sending_lot_allocations (migration 005) is left as it is: it still records the
-- USDT draw, but from now on only sendings paid directly write to it.

-- What the USDT given up in this sale cost in EUR, from walking
-- crypto_purchases at the moment of the sale. Never recomputed afterwards.
--
-- Rows logged before this column existed get 0, which means "cost unknown, not
-- free": those bolivares carry no cost basis until the row is corrected by hand.
alter table ves_sales add column if not exists eur_cost numeric(20, 8) not null default 0;

-- Sale lot allocations: the audit trail for the sale side.
-- One row per (VES sale, crypto purchase lot) pair, saying how much USDT that
-- sale drew from that lot and at what price. Summing usdt_amount *
-- price_eur_per_usdt over one sale reproduces its eur_cost exactly.
create table if not exists sale_lot_allocations (
  id                 bigserial primary key,
  ves_sale_id        bigint         not null references ves_sales (id) on delete cascade,
  crypto_purchase_id bigint         not null references crypto_purchases (id),
  usdt_amount        numeric(20, 8) not null,   -- how much was drawn from this lot
  price_eur_per_usdt numeric(20, 8) not null    -- that lot's price, copied here for audit
);

create index if not exists sale_lot_allocations_sale_idx on sale_lot_allocations (ves_sale_id);
create index if not exists sale_lot_allocations_purchase_idx on sale_lot_allocations (crypto_purchase_id);
