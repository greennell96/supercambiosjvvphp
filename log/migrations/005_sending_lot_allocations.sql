-- Sending lot allocations: the audit trail.
-- One row per (sending, crypto purchase lot) pair, saying how much USDT that
-- sending drew from that lot and at what price. Summing usdt_amount *
-- price_eur_per_usdt over one sending reproduces its cost_eur exactly.

create table if not exists sending_lot_allocations (
  id                 bigserial primary key,
  sending_id         bigint         not null references sendings (id) on delete cascade,
  crypto_purchase_id bigint         not null references crypto_purchases (id),
  usdt_amount        numeric(20, 8) not null,   -- how much was drawn from this lot
  price_eur_per_usdt numeric(20, 8) not null    -- that lot's price, copied here for audit
);

create index if not exists sending_lot_allocations_sending_idx on sending_lot_allocations (sending_id);
create index if not exists sending_lot_allocations_purchase_idx on sending_lot_allocations (crypto_purchase_id);
