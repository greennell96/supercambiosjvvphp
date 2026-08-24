-- VES sales: every batch of USDT sold on Binance P2P for bolivares, where the
-- bolivares landed in Jose's own Venezuelan bank account.
--
-- This is the second FIFO pool, and it is the exact mirror of crypto_purchases:
-- that one tracks what USDT cost in EUR ("precio izquierda"), this one tracks
-- what bolivares cost in USDT ("precio derecha"). Pending sendings are paid out
-- of this balance, later, in batches.
--
-- Sales made straight into a beneficiary's account are NOT recorded here: those
-- bolivares never enter the pool. They live on the sending itself, as
-- paid_via = 'direct'.

create table if not exists ves_sales (
  id             bigserial primary key,
  sold_at        timestamptz    not null,        -- FIFO order is decided by this column
  usdt_sold      numeric(20, 8) not null,        -- USDT given up in this sale
  ves_received   numeric(20, 8) not null,        -- bolivares received for them

  -- ves_received / usdt_sold, stored so the allocation audit trail can quote
  -- the exact price this lot was drawn at without recomputing it.
  price_ves_per_usdt numeric(20, 8) not null,

  -- How many of this lot's bolivares are still unspent.
  -- Starts equal to ves_received and is decremented as sendings are paid.
  -- It is ALLOWED to go negative: that means bolivares were already paid out
  -- that no sale covers yet. The next sale pays that down first.
  remaining_ves  numeric(20, 8) not null
);

-- The FIFO walk always reads "oldest first", so index exactly that order.
create index if not exists ves_sales_fifo_idx on ves_sales (sold_at, id);
