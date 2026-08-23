-- Sending VES allocations: the audit trail for the bolivares side.
--
-- One row per (sending, VES sale lot) pair, saying how many bolivares that
-- sending drew from that sale and at what price. Summing
-- ves_amount / price_ves_per_usdt over one sending reproduces its usdt_used.
--
-- Only sendings paid with paid_via = 'pool' have rows here. A direct sale never
-- touches the pool, so it has none.

create table if not exists sending_ves_allocations (
  id                 bigserial primary key,
  sending_id         bigint         not null references sendings (id) on delete cascade,
  ves_sale_id        bigint         not null references ves_sales (id),
  ves_amount         numeric(20, 8) not null,   -- bolivares drawn from this sale
  price_ves_per_usdt numeric(20, 8) not null    -- that sale's price, copied here for audit
);

create index if not exists sending_ves_allocations_sending_idx on sending_ves_allocations (sending_id);
create index if not exists sending_ves_allocations_sale_idx on sending_ves_allocations (ves_sale_id);
