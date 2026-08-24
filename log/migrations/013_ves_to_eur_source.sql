-- A second source for the VES FIFO pool.
--
-- Existing rows are Binance sales: USDT left the crypto pool and produced VES.
-- A VES -> EUR exchange instead receives VES directly and creates an EUR
-- liability. Its agreed EUR amount is the lot's complete cost basis whether
-- Jose has paid it yet or not; eur_settled_at is only a personal reminder.
-- Both sources make their VES available immediately and share the same FIFO
-- balance, backorder and deletion rules.

alter table ves_sales
  add column if not exists source_type text not null default 'binance';

alter table ves_sales
  add column if not exists eur_amount numeric(20, 8),
  add column if not exists note text not null default '',
  add column if not exists eur_settled_at timestamptz;

-- These two facts do not exist on VES -> EUR rows. Null means not applicable,
-- never zero: a zero price would look like a real but invalid Binance trade.
alter table ves_sales alter column usdt_sold drop not null;
alter table ves_sales alter column price_ves_per_usdt drop not null;

alter table ves_sales drop constraint if exists ves_sales_source_type_check;
alter table ves_sales add constraint ves_sales_source_type_check check (
  source_type in ('binance', 'ves_to_eur')
);

alter table ves_sales drop constraint if exists ves_sales_source_shape_check;
alter table ves_sales add constraint ves_sales_source_shape_check check (
  (
    source_type = 'binance'
    and usdt_sold is not null and usdt_sold > 0
    and price_ves_per_usdt is not null and price_ves_per_usdt > 0
    and eur_amount is null
    and eur_settled_at is null
  )
  or
  (
    source_type = 'ves_to_eur'
    and usdt_sold is null
    and price_ves_per_usdt is null
    and eur_amount is not null and eur_amount > 0
    and eur_cost = eur_amount
  )
);

-- A sending allocation sourced from direct VES has no VES/USDT price. The
-- amount and lot id still preserve its FIFO trail; cost comes from the source
-- row's eur_cost / ves_received, as it already does for every VES lot.
alter table sending_ves_allocations alter column price_ves_per_usdt drop not null;
